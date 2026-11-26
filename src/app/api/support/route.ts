import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, coordinatorMessages, users, notifications } from "@/db";
import { getSessionUser, isReadOnlyRole, recordAuditLog } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ messages: [] });
  }

  const all = await db
    .select()
    .from(coordinatorMessages)
    .orderBy(desc(coordinatorMessages.createdAt));

  const visible =
    user.role === "client"
      ? all.filter((m) => m.senderUserId === user.id || m.senderEmail === user.email)
      : all;

  return NextResponse.json({ messages: visible });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      {
        error:
          "README Role is Read-Only. Switch to Client or sign out as a visitor to send a coordinator message.",
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const senderName = String(body.senderName || user?.fullName || "").trim();
  const senderEmail = String(body.senderEmail || user?.email || "").trim();
  const subject = String(body.subject || "Family Coordinator Assistance Request").trim();
  const message = String(body.message || "").trim();
  const bookingId = body.bookingId ? Number(body.bookingId) : null;

  if (!senderName || !senderEmail || !message) {
    return NextResponse.json(
      { error: "Please provide your name, email address, and message." },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(coordinatorMessages)
    .values({
      bookingId,
      senderUserId: user?.id ?? null,
      senderName,
      senderEmail,
      subject,
      message,
      status: "open",
    })
    .returning();

  const allUsers = await db.select().from(users);
  const coordinators = allUsers.filter(
    (u) => u.active && (u.role === "coordinator" || u.role === "admin")
  );
  for (const c of coordinators) {
    await db.insert(notifications).values({
      userId: c.id,
      bookingId,
      title: `New Coordinator Message from ${senderName}`,
      message: `${subject}: "${message.slice(0, 100)}"`,
      category: "support",
    });
  }

  await recordAuditLog({
    actor: user,
    action: "COORDINATOR_MESSAGE_SENT",
    entityType: "coordinator_message",
    entityId: created.id,
    summary: `Online coordinator support request submitted by ${senderName} (web portal, zero phone pressure).`,
  });

  return NextResponse.json({ ok: true, item: created });
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user || isReadOnlyRole(user)) {
    return NextResponse.json(
      { error: "Coordinator or Admin permission required." },
      { status: 403 }
    );
  }
  if (user.role !== "coordinator" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Only Coordinators and Admins may respond to family inquiries." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const reply = String(body.coordinatorReply || "").trim();
  const status = String(body.status || "responded");

  if (!id || !reply) {
    return NextResponse.json(
      { error: "Please write a gentle reply message." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(coordinatorMessages)
    .set({
      coordinatorReply: reply,
      repliedByName: user.fullName,
      repliedAt: new Date(),
      status,
    })
    .where(eq(coordinatorMessages.id, id))
    .returning();

  if (updated?.senderUserId) {
    await db.insert(notifications).values({
      userId: updated.senderUserId,
      bookingId: updated.bookingId,
      title: `Coordinator Reply: ${updated.subject}`,
      message: `${user.fullName}: "${reply.slice(0, 120)}"`,
      category: "support",
    });
  }

  await recordAuditLog({
    actor: user,
    action: "COORDINATOR_MESSAGE_REPLIED",
    entityType: "coordinator_message",
    entityId: id,
    summary: `${user.fullName} replied to inquiry #${id}.`,
  });

  return NextResponse.json({ ok: true, item: updated });
}
