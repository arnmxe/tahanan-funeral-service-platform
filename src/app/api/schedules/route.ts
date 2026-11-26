import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, schedules, resources, users, bookings, notifications } from "@/db";
import { getSessionUser, isReadOnlyRole, recordAuditLog } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();

  const [allSchedules, allResources, allUsers, allBookings] = await Promise.all([
    db.select().from(schedules).orderBy(asc(schedules.startTime)),
    db.select().from(resources),
    db.select().from(users),
    db.select().from(bookings),
  ]);

  const formatted = allSchedules.map((s) => {
    const resource = allResources.find((r) => r.id === s.resourceId) || null;
    const staff = allUsers.find((u) => u.id === s.assignedStaffId) || null;
    const booking = allBookings.find((b) => b.id === s.bookingId) || null;

    const isOwnerOrStaff =
      user &&
      (user.role !== "client" || (booking && booking.clientId === user.id));

    return {
      id: s.id,
      bookingId: isOwnerOrStaff ? s.bookingId : null,
      bookingRef: isOwnerOrStaff ? booking?.referenceCode || null : null,
      resourceId: s.resourceId,
      resourceName: resource?.name || "Facility Resource",
      resourceType: resource?.type || "chapel",
      assignedStaffId: isOwnerOrStaff ? s.assignedStaffId : null,
      assignedStaffName: isOwnerOrStaff ? staff?.fullName || "Unassigned" : "Assigned Crew",
      title: isOwnerOrStaff
        ? s.title
        : `${resource?.name || "Resource"} — Reserved (${s.eventType})`,
      eventType: s.eventType,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      taskStatus: s.taskStatus,
      notes: isOwnerOrStaff ? s.notes : null,
    };
  });

  return NextResponse.json({ schedules: formatted });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      {
        error:
          "README Role is Read-Only. Switch to Coordinator or Admin to schedule chapels, vehicles, or staff.",
      },
      { status: 403 }
    );
  }
  if (user.role !== "coordinator" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Only Coordinators and Admins may create facility & vehicle schedules." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const bookingId = body.bookingId ? Number(body.bookingId) : null;
  const resourceId = body.resourceId ? Number(body.resourceId) : null;
  const assignedStaffId = body.assignedStaffId ? Number(body.assignedStaffId) : null;
  const title = String(body.title || "").trim();
  const eventType = String(body.eventType || "transfer");
  const location = String(body.location || "Tahanan ng Kapayapaan").trim();
  const notes = String(body.notes || "").trim();
  const startRaw = String(body.startTime || "");
  const endRaw = String(body.endTime || "");

  if (!title || !startRaw || !endRaw) {
    return NextResponse.json(
      { error: "Event title, start date/time, and end date/time are required." },
      { status: 400 }
    );
  }

  const startTime = new Date(startRaw);
  const endTime = new Date(endRaw);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
    return NextResponse.json(
      { error: "End time must be after the start time." },
      { status: 400 }
    );
  }

  // Strict Anti-Double-Booking Validation
  const existing = await db.select().from(schedules);

  if (resourceId) {
    const resourceConflict = existing.find(
      (s) =>
        s.resourceId === resourceId &&
        s.taskStatus !== "completed" &&
        startTime < new Date(s.endTime) &&
        endTime > new Date(s.startTime)
    );

    if (resourceConflict) {
      return NextResponse.json(
        {
          error: `Double-booking prevented: Selected chapel/vehicle is already reserved for "${resourceConflict.title}" (${new Date(
            resourceConflict.startTime
          ).toLocaleString()} – ${new Date(resourceConflict.endTime).toLocaleString()}).`,
        },
        { status: 409 }
      );
    }
  }

  if (assignedStaffId) {
    const staffConflict = existing.find(
      (s) =>
        s.assignedStaffId === assignedStaffId &&
        s.taskStatus !== "completed" &&
        startTime < new Date(s.endTime) &&
        endTime > new Date(s.startTime)
    );

    if (staffConflict) {
      return NextResponse.json(
        {
          error: `Double-booking prevented: Assigned driver/staff member already has an overlapping task "${staffConflict.title}".`,
        },
        { status: 409 }
      );
    }
  }

  const [created] = await db
    .insert(schedules)
    .values({
      bookingId,
      resourceId,
      assignedStaffId,
      title,
      eventType,
      startTime,
      endTime,
      location,
      taskStatus: "scheduled",
      notes: notes || null,
    })
    .returning();

  if (assignedStaffId) {
    await db.insert(notifications).values({
      userId: assignedStaffId,
      bookingId,
      title: `New Schedule Assigned: ${title}`,
      message: `${location} • Starts ${startTime.toLocaleString()}`,
      category: "schedule",
    });
  }

  await recordAuditLog({
    actor: user,
    action: "SCHEDULE_CREATED",
    entityType: "schedule",
    entityId: created.id,
    summary: `Scheduled "${title}" (${eventType}) with anti-overlap verification.`,
  });

  return NextResponse.json({ ok: true, schedule: created });
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      { error: "README Role is Read-Only. Switch to Driver/Staff or Coordinator to update tasks." },
      { status: 403 }
    );
  }
  if (user.role === "client") {
    return NextResponse.json(
      { error: "Staff operational schedules can only be updated by staff or coordinators." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const scheduleId = Number(body.id);
  const taskStatus = String(body.taskStatus || "scheduled");
  const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

  if (!scheduleId || !["scheduled", "in_progress", "completed"].includes(taskStatus)) {
    return NextResponse.json({ error: "Invalid schedule task update." }, { status: 400 });
  }

  const updates: Partial<typeof schedules.$inferInsert> = { taskStatus };
  if (notes !== undefined) updates.notes = notes;

  const [updated] = await db
    .update(schedules)
    .set(updates)
    .where(eq(schedules.id, scheduleId))
    .returning();

  await recordAuditLog({
    actor: user,
    action: "SCHEDULE_TASK_UPDATED",
    entityType: "schedule",
    entityId: scheduleId,
    summary: `${user.fullName} marked task "${updated?.title}" as ${taskStatus}.`,
  });

  return NextResponse.json({ ok: true, schedule: updated });
}
