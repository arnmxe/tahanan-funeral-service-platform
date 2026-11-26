import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bookings, invoices, payments, quotations, notifications } from "@/db";
import {
  getSessionUser,
  isReadOnlyRole,
  recordAuditLog,
  generatePaymongoTestSignature,
  verifyPaymongoTestSignature,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to process payments." }, { status: 401 });
  }
  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      {
        error:
          "README Role is strictly Read-Only. Switch to Family/Client or Coordinator to test payment processing.",
      },
      { status: 403 }
    );
  }
  if (user.role === "staff") {
    return NextResponse.json(
      { error: "Staff accounts do not process billing or client payments." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const bookingId = Number(body.bookingId);

  if (!bookingId) {
    return NextResponse.json({ error: "Valid booking ID is required." }, { status: 400 });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (user.role === "client" && booking.clientId !== user.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const [quote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.bookingId, booking.id))
    .limit(1);

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.bookingId, booking.id))
    .limit(1);

  // Step 1: Create Server-Signed PayMongo TEST MODE Session
  if (action === "create_paymongo_session") {
    if (quote && quote.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Please review and approve the itemized quotation first before initiating a payment.",
        },
        { status: 400 }
      );
    }

    const amountPhp = Math.round(Number(body.amountPhp || 0));
    const method = String(body.method || "paymongo_gcash_test");
    const paymentStage = String(body.paymentStage || "downpayment");

    if (amountPhp <= 0 || amountPhp > booking.balancePhp) {
      return NextResponse.json(
        {
          error: `Payment amount must be between ₱1 and the remaining balance of ₱${booking.balancePhp.toLocaleString()}.`,
        },
        { status: 400 }
      );
    }

    // Never allow live PayMongo secret keys; strictly enforce TEST MODE ONLY
    const envSecret = process.env.PAYMONGO_SECRET_KEY || "";
    if (envSecret && !envSecret.startsWith("sk_test_")) {
      return NextResponse.json(
        {
          error:
            "Safety block: Only PayMongo TEST MODE keys (sk_test_*) are permitted in this platform.",
        },
        { status: 400 }
      );
    }

    const { sessionId, signatureHash } = generatePaymongoTestSignature(
      booking.referenceCode,
      amountPhp,
      method
    );

    await recordAuditLog({
      actor: user,
      action: "PAYMONGO_TEST_SESSION_CREATED",
      entityType: "payment_session",
      entityId: sessionId,
      summary: `Created PayMongo TEST MODE session (${method}) for ₱${amountPhp.toLocaleString()} on ${booking.referenceCode}.`,
      metadata: { testMode: true, cardDataStored: false },
    });

    return NextResponse.json({
      ok: true,
      testSession: {
        sessionId,
        signatureHash,
        bookingId: booking.id,
        bookingRef: booking.referenceCode,
        amountPhp,
        method,
        paymentStage,
        environment: "PAYMONGO_TEST_MODE",
      },
    });
  }

  // Step 2: Server-Side Confirmation & Cryptographic Signature Verification
  if (action === "confirm_paymongo_session") {
    const sessionId = String(body.sessionId || "");
    const signatureHash = String(body.signatureHash || "");
    const amountPhp = Math.round(Number(body.amountPhp || 0));
    const method = String(body.method || "paymongo_gcash_test");
    const paymentStage = String(body.paymentStage || "downpayment");
    const simulateFailure = Boolean(body.simulateFailure);

    if (simulateFailure) {
      await recordAuditLog({
        actor: user,
        action: "PAYMONGO_TEST_DECLINED",
        entityType: "payment_session",
        entityId: sessionId || "declined",
        summary: `Simulated declined PayMongo TEST payment for ${booking.referenceCode}. Balance unchanged.`,
      });
      return NextResponse.json(
        {
          error:
            "Test payment simulation: Payment was declined by test issuer. No charges were made and your balance remains unchanged.",
        },
        { status: 402 }
      );
    }

    const isSignatureValid = verifyPaymongoTestSignature(
      sessionId,
      amountPhp,
      method,
      signatureHash
    );

    if (!isSignatureValid) {
      return NextResponse.json(
        {
          error:
            "Server-side PayMongo signature verification failed. Payment could not be confirmed.",
        },
        { status: 400 }
      );
    }

    if (amountPhp <= 0 || amountPhp > booking.balancePhp) {
      return NextResponse.json(
        { error: "Amount exceeds current remaining balance." },
        { status: 400 }
      );
    }

    const receiptNumber = `AR-2026-${Math.floor(5100 + Math.random() * 4800)}`;
    const newPaid = booking.amountPaidPhp + amountPhp;
    const newBalance = Math.max(0, booking.totalAmountPhp - newPaid);

    const [createdPayment] = await db
      .insert(payments)
      .values({
        bookingId: booking.id,
        invoiceId: invoice?.id ?? null,
        receiptNumber,
        amountPhp,
        paymentStage: newBalance === 0 ? "full_balance" : paymentStage,
        method,
        paymongoSessionId: sessionId,
        paymongoSignatureHash: signatureHash,
        verificationStatus: "verified",
        payerName: user.fullName,
        payerEmail: user.email,
        notes: `PayMongo TEST MODE (${method.replace(/_/g, " ")}) verified server-side. Zero card data stored. Official Acknowledgment Receipt issued.`,
        verifiedAt: new Date(),
      })
      .returning();

    if (invoice) {
      await db
        .update(invoices)
        .set({
          amountPaidPhp: newPaid,
          balancePhp: newBalance,
          paymentStatus: newBalance === 0 ? "paid" : "partial",
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id));
    }

    const nextStatus =
      newBalance === 0
        ? booking.status === "completed"
          ? "completed"
          : "fully_paid"
        : newPaid >= booking.downpaymentRequiredPhp
        ? "in_coordination"
        : "downpayment_paid";

    const nextWorkflowStage =
      newBalance === 0
        ? Math.max(booking.workflowStage, 10)
        : newPaid >= booking.downpaymentRequiredPhp
        ? Math.max(booking.workflowStage, 9)
        : Math.max(booking.workflowStage, 8);

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        amountPaidPhp: newPaid,
        balancePhp: newBalance,
        status: nextStatus,
        workflowStage: nextWorkflowStage,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    if (booking.clientId) {
      await db.insert(notifications).values({
        userId: booking.clientId,
        bookingId: booking.id,
        title: `Acknowledgment Receipt Issued (${receiptNumber})`,
        message: `PayMongo TEST payment of ₱${amountPhp.toLocaleString()} verified server-side. Updated balance: ₱${newBalance.toLocaleString()}.`,
        category: "payment",
      });
    }

    if (booking.coordinatorId) {
      await db.insert(notifications).values({
        userId: booking.coordinatorId,
        bookingId: booking.id,
        title: `Payment Verified on ${booking.referenceCode} (${receiptNumber})`,
        message: `₱${amountPhp.toLocaleString()} verified via PayMongo Test Mode. Remaining balance: ₱${newBalance.toLocaleString()}.`,
        category: "payment",
      });
    }

    await recordAuditLog({
      actor: user,
      action: "PAYMENT_VERIFIED_SERVER_SIDE",
      entityType: "payment",
      entityId: receiptNumber,
      summary: `Server-verified PayMongo TEST payment ${receiptNumber} (₱${amountPhp.toLocaleString()}) for ${booking.referenceCode}. Balance: ₱${newBalance.toLocaleString()}.`,
      metadata: { sessionId, method, cardDataStored: false },
    });

    return NextResponse.json({
      ok: true,
      payment: createdPayment,
      booking: updatedBooking,
    });
  }

  // Step 3: Manually Recorded Cash / Bank Transfer (Coordinator or Admin only)
  if (action === "record_manual_payment") {
    if (user.role !== "coordinator" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only Coordinators and Admins can manually record cash or bank payments." },
        { status: 403 }
      );
    }

    const amountPhp = Math.round(Number(body.amountPhp || 0));
    const method = body.method === "bank_transfer" ? "bank_transfer" : "manual_cash";
    const payerName = String(body.payerName || booking.contactPersonName).trim();
    const notes = String(
      body.notes || "Recorded at Arrangement Desk; Acknowledgment Receipt issued."
    ).trim();

    if (amountPhp <= 0 || amountPhp > booking.balancePhp) {
      return NextResponse.json(
        {
          error: `Amount must be between ₱1 and remaining balance ₱${booking.balancePhp.toLocaleString()}.`,
        },
        { status: 400 }
      );
    }

    const receiptNumber = `AR-2026-${Math.floor(5100 + Math.random() * 4800)}`;
    const newPaid = booking.amountPaidPhp + amountPhp;
    const newBalance = Math.max(0, booking.totalAmountPhp - newPaid);

    const [createdPayment] = await db
      .insert(payments)
      .values({
        bookingId: booking.id,
        invoiceId: invoice?.id ?? null,
        receiptNumber,
        amountPhp,
        paymentStage:
          newBalance === 0
            ? "full_balance"
            : booking.amountPaidPhp === 0
            ? "downpayment"
            : "installment",
        method,
        verificationStatus: "verified",
        payerName,
        payerEmail: booking.contactPersonEmail,
        recordedByUserId: user.id,
        notes,
        verifiedAt: new Date(),
      })
      .returning();

    if (invoice) {
      await db
        .update(invoices)
        .set({
          amountPaidPhp: newPaid,
          balancePhp: newBalance,
          paymentStatus: newBalance === 0 ? "paid" : "partial",
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id));
    }

    const nextStatus =
      newBalance === 0
        ? booking.status === "completed"
          ? "completed"
          : "fully_paid"
        : "in_coordination";
    const nextStage =
      newBalance === 0
        ? Math.max(booking.workflowStage, 10)
        : Math.max(booking.workflowStage, 9);

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        amountPaidPhp: newPaid,
        balancePhp: newBalance,
        status: nextStatus,
        workflowStage: nextStage,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    if (booking.clientId) {
      await db.insert(notifications).values({
        userId: booking.clientId,
        bookingId: booking.id,
        title: `Cash/Desk Acknowledgment Receipt (${receiptNumber})`,
        message: `${user.fullName} recorded ₱${amountPhp.toLocaleString()} (${method.replace(
          "_",
          " "
        )}). Remaining balance: ₱${newBalance.toLocaleString()}.`,
        category: "payment",
      });
    }

    await recordAuditLog({
      actor: user,
      action: "MANUAL_PAYMENT_RECORDED",
      entityType: "payment",
      entityId: receiptNumber,
      summary: `${user.fullName} recorded ${method} payment ${receiptNumber} (₱${amountPhp.toLocaleString()}) for ${booking.referenceCode}.`,
    });

    return NextResponse.json({
      ok: true,
      payment: createdPayment,
      booking: updatedBooking,
    });
  }

  return NextResponse.json({ error: "Unsupported payment action." }, { status: 400 });
}
