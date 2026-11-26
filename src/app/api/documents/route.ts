import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, bookings, documents, notifications } from "@/db";
import { getSessionUser, isReadOnlyRole, recordAuditLog } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to upload documents." }, { status: 401 });
  }
  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      { error: "README Role is Read-Only. Switch to Client or Coordinator to upload documents." },
      { status: 403 }
    );
  }
  if (user.role === "staff") {
    return NextResponse.json(
      { error: "Staff accounts cannot upload private family civil documents." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const bookingId = Number(body.bookingId);
  const requirementCode = String(body.requirementCode || "supporting_document").trim();
  const documentLabel = String(body.documentLabel || "Supporting Civil Document").trim();
  const fileName = String(body.fileName || "document.pdf").trim();
  const mimeType = String(body.mimeType || "").toLowerCase();
  const fileSizeBytes = Number(body.fileSizeBytes || 0);
  const dataUrl = String(body.dataUrl || "");

  if (!bookingId) {
    return NextResponse.json({ error: "Valid booking reference is required." }, { status: 400 });
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

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      {
        error:
          "Unsupported file format. Please upload a PDF, JPG, PNG, WebP, or SVG document.",
      },
      { status: 400 }
    );
  }

  if (fileSizeBytes <= 0 || fileSizeBytes > MAX_FILE_SIZE_BYTES || !dataUrl.startsWith("data:")) {
    return NextResponse.json(
      { error: "Document must be valid and under 5 MB." },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(documents)
    .values({
      bookingId: booking.id,
      requirementCode,
      documentLabel,
      fileName,
      mimeType,
      fileSizeBytes,
      privateStoragePayload: dataUrl,
      status: "pending",
      reviewerNote: "Uploaded to RA 10173 private storage; awaiting coordinator verification.",
      uploadedByUserId: user.id,
    })
    .returning();

  if (booking.coordinatorId && user.role === "client") {
    await db.insert(notifications).values({
      userId: booking.coordinatorId,
      bookingId: booking.id,
      title: `New Document Uploaded (${booking.referenceCode})`,
      message: `${user.fullName} uploaded "${documentLabel}" (${fileName}) for verification.`,
      category: "document",
    });
  }

  await recordAuditLog({
    actor: user,
    action: "DOCUMENT_UPLOADED",
    entityType: "document",
    entityId: created.id,
    summary: `Uploaded private document "${documentLabel}" for ${booking.referenceCode}.`,
  });

  return NextResponse.json({
    ok: true,
    document: {
      id: created.id,
      bookingId: created.bookingId,
      requirementCode: created.requirementCode,
      documentLabel: created.documentLabel,
      fileName: created.fileName,
      mimeType: created.mimeType,
      fileSizeBytes: created.fileSizeBytes,
      status: created.status,
      reviewerNote: created.reviewerNote,
      createdAt: created.createdAt,
    },
  });
}
