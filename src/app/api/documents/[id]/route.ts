import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bookings, documents, notifications } from "@/db";
import { getSessionUser, isReadOnlyRole, recordAuditLog } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role === "readme" || user.role === "staff") {
    return NextResponse.json(
      {
        error:
          "Under RA 10173 Data Privacy controls, raw civil IDs and death certificates are restricted to the Family Owner, Assigned Coordinator, and Data Privacy Admin.",
      },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const docId = Number(id);
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, doc.bookingId))
    .limit(1);

  if (user.role === "client" && booking?.clientId !== user.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  return NextResponse.json({
    id: doc.id,
    fileName: doc.fileName,
    documentLabel: doc.documentLabel,
    mimeType: doc.mimeType,
    dataUrl: doc.privateStoragePayload,
  });
}

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
      { error: "README Role is Read-Only. Switch to Coordinator or Admin to verify documents." },
      { status: 403 }
    );
  }
  if (user.role !== "coordinator" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Only Coordinators and Admins may review document status." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const docId = Number(id);
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "pending");
  const reviewerNote = String(body.reviewerNote || "").trim();

  if (!["pending", "verified", "needs_revision"].includes(status)) {
    return NextResponse.json({ error: "Invalid document status." }, { status: 400 });
  }

  const [updated] = await db
    .update(documents)
    .set({
      status,
      reviewerNote:
        reviewerNote ||
        (status === "verified"
          ? "Verified by coordinator."
          : status === "needs_revision"
          ? "Please upload a clearer scan or missing signature page."
          : "Pending review."),
      reviewedByUserId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, docId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, updated.bookingId))
    .limit(1);

  if (booking?.clientId) {
    await db.insert(notifications).values({
      userId: booking.clientId,
      bookingId: booking.id,
      title: `Document Status: ${status.replace("_", " ").toUpperCase()} (${booking.referenceCode})`,
      message: `"${updated.documentLabel}" was marked ${status.replace("_", " ")}. ${updated.reviewerNote || ""}`,
      category: "document",
    });
  }

  await recordAuditLog({
    actor: user,
    action: "DOCUMENT_REVIEWED",
    entityType: "document",
    entityId: updated.id,
    summary: `Marked "${updated.documentLabel}" as ${status} on ${booking?.referenceCode}.`,
  });

  return NextResponse.json({
    ok: true,
    document: {
      id: updated.id,
      status: updated.status,
      reviewerNote: updated.reviewerNote,
      updatedAt: updated.updatedAt,
    },
  });
}
