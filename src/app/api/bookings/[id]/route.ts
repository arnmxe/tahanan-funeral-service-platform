import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  db,
  bookings,
  quotations,
  invoices,
  notifications,
  type QuotationLineItem,
} from "@/db";
import { getSessionUser, isReadOnlyRole, recordAuditLog } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      {
        error:
          "README Role is strictly Read-Only. Switch to Client, Coordinator, Staff, or Admin to perform case actions.",
      },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const bookingId = Number(id);
  if (!bookingId) {
    return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return NextResponse.json({ error: "Case record not found." }, { status: 404 });
  }

  if (user.role === "client" && booking.clientId !== user.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "approve_quotation") {
    if (user.role === "staff") {
      return NextResponse.json({ error: "Not permitted." }, { status: 403 });
    }

    const [quote] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.bookingId, booking.id))
      .limit(1);

    if (!quote) {
      return NextResponse.json(
        { error: "No quotation found for this booking yet." },
        { status: 400 }
      );
    }

    await db
      .update(quotations)
      .set({
        status: "approved",
        approvedByName: user.fullName,
        approvedAt: new Date(),
      })
      .where(eq(quotations.id, quote.id));

    const nextStage = Math.max(booking.workflowStage, 7);
    const nextStatus =
      booking.amountPaidPhp > 0 ? booking.status : "quotation_approved";

    const [updated] = await db
      .update(bookings)
      .set({
        status: nextStatus,
        workflowStage: nextStage,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    if (booking.coordinatorId) {
      await db.insert(notifications).values({
        userId: booking.coordinatorId,
        bookingId: booking.id,
        title: `Quotation Approved by Family (${booking.referenceCode})`,
        message: `${user.fullName} approved ${quote.quotationNumber}. Ready for initial down payment and coordination.`,
        category: "approval",
      });
    }

    await recordAuditLog({
      actor: user,
      action: "QUOTATION_APPROVED",
      entityType: "quotation",
      entityId: quote.quotationNumber,
      summary: `${user.fullName} approved quotation ${quote.quotationNumber} for ${booking.referenceCode}.`,
    });

    return NextResponse.json({ ok: true, booking: updated });
  }

  if (action === "update_quotation") {
    if (user.role !== "coordinator" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only Coordinators or Admins can revise quotations." },
        { status: 403 }
      );
    }

    const [quote] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.bookingId, booking.id))
      .limit(1);

    if (!quote) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    const discountPhp = Math.max(0, Number(body.discountPhp ?? quote.discountPhp));
    const discountLabel = String(body.discountLabel ?? quote.discountLabel ?? "").trim();
    const extraDescription = String(body.extraDescription || "").trim();
    const extraPricePhp = Number(body.extraPricePhp || 0);

    const updatedItems: QuotationLineItem[] = [...(quote.lineItems || [])];
    if (extraDescription && extraPricePhp > 0) {
      updatedItems.push({
        id: `li-custom-${Date.now()}`,
        description: extraDescription,
        category: "adjustment",
        quantity: 1,
        unitPricePhp: extraPricePhp,
        totalPhp: extraPricePhp,
      });
    }

    const subtotalPhp = updatedItems.reduce((sum, i) => sum + i.totalPhp, 0);
    const totalPhp = Math.max(0, subtotalPhp - discountPhp);
    const downpaymentRequiredPhp = Math.round(totalPhp * 0.3);
    const newBalancePhp = Math.max(0, totalPhp - booking.amountPaidPhp);

    await db
      .update(quotations)
      .set({
        lineItems: updatedItems,
        subtotalPhp,
        discountPhp,
        discountLabel: discountLabel || null,
        totalPhp,
        downpaymentRequiredPhp,
        status: quote.status === "approved" ? "approved" : "pending_approval",
        notes: String(body.notes ?? quote.notes ?? ""),
      })
      .where(eq(quotations.id, quote.id));

    await db
      .update(invoices)
      .set({
        totalAmountPhp: totalPhp,
        downpaymentAmountPhp: downpaymentRequiredPhp,
        balancePhp: newBalancePhp,
        paymentStatus:
          newBalancePhp === 0
            ? "paid"
            : booking.amountPaidPhp > 0
            ? "partial"
            : "unpaid",
        updatedAt: new Date(),
      })
      .where(eq(invoices.bookingId, booking.id));

    const [updated] = await db
      .update(bookings)
      .set({
        totalAmountPhp: totalPhp,
        downpaymentRequiredPhp,
        balancePhp: newBalancePhp,
        status:
          booking.status === "draft" || booking.status === "inquiry"
            ? "quotation_sent"
            : booking.status,
        workflowStage: Math.max(booking.workflowStage, 6),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    if (booking.clientId) {
      await db.insert(notifications).values({
        userId: booking.clientId,
        bookingId: booking.id,
        title: `Updated Quotation Shared (${quote.quotationNumber})`,
        message: `Your itemized quotation has been updated to ₱${totalPhp.toLocaleString()}.`,
        category: "approval",
      });
    }

    await recordAuditLog({
      actor: user,
      action: "QUOTATION_UPDATED",
      entityType: "quotation",
      entityId: quote.quotationNumber,
      summary: `Updated quotation ${quote.quotationNumber} total to ₱${totalPhp.toLocaleString()}.`,
    });

    return NextResponse.json({ ok: true, booking: updated });
  }

  if (action === "toggle_checklist") {
    if (user.role === "client") {
      return NextResponse.json(
        { error: "Checklist items are updated by assigned staff and coordinators." },
        { status: 403 }
      );
    }

    const itemId = String(body.itemId || "");
    const newItemLabel = String(body.newItemLabel || "").trim();
    const list = [...(booking.checklist || [])];

    if (newItemLabel) {
      list.push({
        id: `chk-${Date.now()}`,
        label: newItemLabel,
        stage: String(body.stage || "Coordination"),
        completed: false,
      });
    } else {
      const idx = list.findIndex((i) => i.id === itemId);
      if (idx >= 0) {
        const nextVal = !list[idx].completed;
        list[idx] = {
          ...list[idx],
          completed: nextVal,
          completedBy: nextVal ? user.fullName : undefined,
          completedAt: nextVal ? new Date().toISOString() : undefined,
        };
      }
    }

    const [updated] = await db
      .update(bookings)
      .set({ checklist: list, updatedAt: new Date() })
      .where(eq(bookings.id, booking.id))
      .returning();

    await recordAuditLog({
      actor: user,
      action: "CHECKLIST_UPDATED",
      entityType: "booking",
      entityId: booking.referenceCode,
      summary: `${user.fullName} updated coordination checklist on ${booking.referenceCode}.`,
    });

    return NextResponse.json({ ok: true, booking: updated });
  }

  if (action === "add_note") {
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Please enter a note message." }, { status: 400 });
    }
    const isInternal = user.role !== "client" && Boolean(body.isInternal);
    const notes = [
      ...(booking.caseNotes || []),
      {
        id: `note-${Date.now()}`,
        authorName: user.fullName,
        authorRole: user.role,
        text,
        isInternal,
        createdAt: new Date().toISOString(),
      },
    ];

    const [updated] = await db
      .update(bookings)
      .set({ caseNotes: notes, updatedAt: new Date() })
      .where(eq(bookings.id, booking.id))
      .returning();

    if (!isInternal && user.role !== "client" && booking.clientId) {
      await db.insert(notifications).values({
        userId: booking.clientId,
        bookingId: booking.id,
        title: `Coordinator Update (${booking.referenceCode})`,
        message: `${user.fullName}: "${text.slice(0, 120)}"`,
        category: "schedule",
      });
    }

    return NextResponse.json({ ok: true, booking: updated });
  }

  if (action === "update_stage") {
    if (user.role !== "coordinator" && user.role !== "admin") {
      return NextResponse.json({ error: "Coordinator or Admin required." }, { status: 403 });
    }

    const updates: Partial<typeof bookings.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.workflowStage === "number") {
      updates.workflowStage = Math.min(11, Math.max(1, body.workflowStage));
    }
    if (typeof body.status === "string") {
      updates.status = body.status;
    }
    if (typeof body.coordinatorId === "number") {
      updates.coordinatorId = body.coordinatorId;
    }

    if (updates.status === "completed") {
      updates.workflowStage = 11;
    }

    const [updated] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, booking.id))
      .returning();

    if (booking.clientId && updates.status) {
      await db.insert(notifications).values({
        userId: booking.clientId,
        bookingId: booking.id,
        title: `Case Progress Updated (${booking.referenceCode})`,
        message: `Your arrangement status is now "${updates.status.replace(/_/g, " ")}".`,
        category: "schedule",
      });
    }

    await recordAuditLog({
      actor: user,
      action: "BOOKING_STAGE_UPDATED",
      entityType: "booking",
      entityId: booking.referenceCode,
      summary: `Updated ${booking.referenceCode} stage=${updated.workflowStage}, status=${updated.status}.`,
    });

    return NextResponse.json({ ok: true, booking: updated });
  }

  return NextResponse.json({ error: "Unsupported case action." }, { status: 400 });
}
