import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, notifications } from "@/db";
import { getSessionUser, isReadOnlyRole } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt));

  const unreadCount = rows.filter((n) => !n.isRead).length;
  return NextResponse.json({ notifications: rows, unreadCount });
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || isReadOnlyRole(user)) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => ({}));
  if (body.markAll) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user.id));
    return NextResponse.json({ ok: true });
  }

  const id = Number(body.id);
  if (id) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }
  return NextResponse.json({ ok: true });
}
