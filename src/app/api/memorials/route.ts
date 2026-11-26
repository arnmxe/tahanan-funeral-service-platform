import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, memorials, bookings } from "@/db";
import { getSessionUser, isReadOnlyRole, recordAuditLog } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();
  const url = new URL(request.url);
  const shareCode = (url.searchParams.get("code") || "").trim().toUpperCase();

  const [allMemorials, allBookings] = await Promise.all([
    db.select().from(memorials).orderBy(desc(memorials.createdAt)),
    db.select().from(bookings),
  ]);

  const visible = allMemorials.filter((m) => {
    if (m.isPublic) return true;
    if (shareCode && m.familyShareCode.toUpperCase() === shareCode) return true;
    if (!user) return false;
    if (user.role === "admin" || user.role === "coordinator" || user.role === "readme") {
      return true;
    }
    const parentBooking = allBookings.find((b) => b.id === m.bookingId);
    return parentBooking?.clientId === user.id;
  });

  return NextResponse.json({ memorials: visible });
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      { error: "README Role is Read-Only and cannot alter memorial settings." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const memorialId = Number(body.id);
  const action = String(body.action || "");

  const [memorial] = await db
    .select()
    .from(memorials)
    .where(eq(memorials.id, memorialId))
    .limit(1);

  if (!memorial) {
    return NextResponse.json({ error: "Memorial page not found." }, { status: 404 });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, memorial.bookingId))
    .limit(1);

  if (action === "update_privacy_or_obituary") {
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const canManage =
      user.role === "admin" ||
      user.role === "coordinator" ||
      (user.role === "client" && booking?.clientId === user.id);

    if (!canManage) {
      return NextResponse.json(
        { error: "Only the family representative may change memorial sharing privacy." },
        { status: 403 }
      );
    }

    const updates: Partial<typeof memorials.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.isPublic === "boolean") updates.isPublic = body.isPublic;
    if (typeof body.obituaryText === "string" && body.obituaryText.trim()) {
      updates.obituaryText = body.obituaryText.trim();
    }
    if (typeof body.familyShareCode === "string" && body.familyShareCode.trim()) {
      updates.familyShareCode = body.familyShareCode.trim().toUpperCase();
    }

    const [updated] = await db
      .update(memorials)
      .set(updates)
      .where(eq(memorials.id, memorial.id))
      .returning();

    await recordAuditLog({
      actor: user,
      action: "MEMORIAL_PRIVACY_UPDATED",
      entityType: "memorial",
      entityId: memorial.slug,
      summary: `Updated memorial "${memorial.deceasedName}" (isPublic=${updated.isPublic}).`,
    });

    return NextResponse.json({ ok: true, memorial: updated });
  }

  if (action === "light_candle_or_tribute") {
    const authorName = String(body.authorName || user?.fullName || "Family Friend").trim();
    const relationship = String(body.relationship || "Well-wisher").trim();
    const message = String(body.message || "").trim();
    const litCandle = body.litCandle !== false;

    const updatedTributes = [...(memorial.tributes || [])];
    if (message) {
      updatedTributes.unshift({
        id: `tr-${Date.now()}`,
        authorName,
        relationship,
        message,
        litCandle,
        createdAt: new Date().toISOString(),
      });
    }

    const [updated] = await db
      .update(memorials)
      .set({
        candlesCount: memorial.candlesCount + (litCandle ? 1 : 0),
        tributes: updatedTributes,
        updatedAt: new Date(),
      })
      .where(eq(memorials.id, memorial.id))
      .returning();

    return NextResponse.json({ ok: true, memorial: updated });
  }

  return NextResponse.json({ error: "Unsupported memorial action." }, { status: 400 });
}
