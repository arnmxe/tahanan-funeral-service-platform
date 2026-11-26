import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import {
  db,
  packages,
  addOns,
  inventory,
  resources,
  documentRequirements,
  users,
  type UserRole,
} from "@/db";
import {
  getSessionUser,
  hashPassword,
  isReadOnlyRole,
  recordAuditLog,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const currentUser = await getSessionUser();

  const [pkgRows, addOnRows, invRows, resRows, docReqRows, userRows] =
    await Promise.all([
      db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id)),
      db.select().from(addOns).orderBy(asc(addOns.id)),
      db.select().from(inventory).orderBy(asc(inventory.id)),
      db.select().from(resources).orderBy(asc(resources.id)),
      db
        .select()
        .from(documentRequirements)
        .orderBy(asc(documentRequirements.sortOrder), asc(documentRequirements.id)),
      db.select().from(users).orderBy(asc(users.id)),
    ]);

  const staffDirectory = userRows
    .filter((u) => u.active && (u.role === "coordinator" || u.role === "staff"))
    .map((u) => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role,
      staffTitle: u.staffTitle,
    }));

  const adminUsers =
    currentUser?.role === "admin" || currentUser?.role === "readme"
      ? userRows.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          staffTitle: u.staffTitle,
          active: u.active,
          createdAt: u.createdAt,
        }))
      : [];

  return NextResponse.json({
    packages: pkgRows,
    addOns: addOnRows,
    inventory: invRows,
    resources: resRows,
    documentRequirements: docReqRows,
    staffDirectory,
    adminUsers,
  });
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
          "README Role is strictly Read-Only. Switch to Admin to modify packages, inventory, or document requirements.",
      },
      { status: 403 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only Admin / Owner accounts may modify catalog configurations." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const entity = String(body.entity || "");

  if (entity === "package") {
    const name = String(body.name || "").trim();
    const nameFil = String(body.nameFil || name).trim();
    const category = String(body.category || "traditional");
    const pricePhp = Math.max(1000, Number(body.pricePhp || 50000));
    const durationDays = Math.max(1, Number(body.durationDays || 3));
    const description = String(body.description || "").trim();
    const descriptionFil = String(body.descriptionFil || description).trim();
    const casketIncluded = String(body.casketIncluded || "Standard Sanctuary Casket").trim();
    const chapelIncluded = String(body.chapelIncluded || "Chapel Suite Included").trim();
    const inclusions: string[] = Array.isArray(body.inclusions)
      ? body.inclusions.map((s: unknown) => String(s).trim()).filter(Boolean)
      : ["Dignified transfer", "Chapel viewing", "Coordinator permit support"];

    if (!name || !description) {
      return NextResponse.json(
        { error: "Package name and description are required." },
        { status: 400 }
      );
    }

    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;

    const [created] = await db
      .insert(packages)
      .values({
        slug,
        name,
        nameFil,
        category,
        pricePhp,
        durationDays,
        description,
        descriptionFil,
        inclusions,
        casketIncluded,
        chapelIncluded,
        active: true,
        sortOrder: 10,
      })
      .returning();

    await recordAuditLog({
      actor: user,
      action: "PACKAGE_CREATED",
      entityType: "package",
      entityId: created.id,
      summary: `Created funeral package "${created.name}" at ₱${created.pricePhp.toLocaleString()}.`,
    });

    return NextResponse.json({ ok: true, item: created });
  }

  if (entity === "inventory") {
    const name = String(body.name || "").trim();
    const sku = String(body.sku || `ITM-${Date.now().toString().slice(-5)}`).trim();
    const category = String(body.category || "casket");
    const material = String(body.material || "Hardwood").trim();
    const finish = String(body.finish || "Warm Satin").trim();
    const dimensions = String(body.dimensions || "Standard").trim();
    const pricePhp = Math.max(500, Number(body.pricePhp || 20000));
    const stockCount = Math.max(0, Number(body.stockCount ?? 3));
    const description = String(body.description || name).trim();
    const imageUrl =
      category === "urn" ? "/images/urn-marble.jpg" : "/images/casket-heritage.jpg";

    if (!name) {
      return NextResponse.json(
        { error: "Inventory item name is required." },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(inventory)
      .values({
        sku,
        name,
        category,
        material,
        finish,
        dimensions,
        pricePhp,
        stockCount,
        reorderLevel: 2,
        imageUrl,
        description,
        active: true,
      })
      .returning();

    await recordAuditLog({
      actor: user,
      action: "INVENTORY_CREATED",
      entityType: "inventory",
      entityId: created.id,
      summary: `Added inventory item "${created.name}" (${created.sku}) with stock ${created.stockCount}.`,
    });

    return NextResponse.json({ ok: true, item: created });
  }

  if (entity === "document_requirement") {
    const name = String(body.name || "").trim();
    const nameFil = String(body.nameFil || name).trim();
    const description = String(body.description || "").trim();
    const appliesTo = String(body.appliesTo || "all");
    const isRequired = body.isRequired !== false;

    if (!name) {
      return NextResponse.json(
        { error: "Document requirement name is required." },
        { status: 400 }
      );
    }

    const code = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "")}_${Date.now().toString().slice(-4)}`;

    const [created] = await db
      .insert(documentRequirements)
      .values({
        code,
        name,
        nameFil,
        description: description || "Required civil supporting document.",
        appliesTo,
        isRequired,
        active: true,
        sortOrder: 20,
      })
      .returning();

    await recordAuditLog({
      actor: user,
      action: "DOC_REQUIREMENT_ADDED",
      entityType: "document_requirement",
      entityId: created.id,
      summary: `Added required document rule "${created.name}" (${created.appliesTo}).`,
    });

    return NextResponse.json({ ok: true, item: created });
  }

  if (entity === "user") {
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "Welcome2026!");
    const role = (body.role as UserRole) || "staff";
    const staffTitle = String(body.staffTitle || "").trim();

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Full name and email are required." },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashPassword(password),
        fullName,
        role,
        staffTitle: staffTitle || `${role.toUpperCase()} Team Member`,
        privacyConsentAt: new Date(),
        active: true,
      })
      .returning();

    await recordAuditLog({
      actor: user,
      action: "USER_CREATED_BY_ADMIN",
      entityType: "user",
      entityId: created.id,
      summary: `Admin created user ${created.fullName} with role ${created.role}.`,
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: created.id,
        email: created.email,
        fullName: created.fullName,
        role: created.role,
        staffTitle: created.staffTitle,
        active: created.active,
      },
    });
  }

  return NextResponse.json({ error: "Unknown catalog entity." }, { status: 400 });
}

export async function PATCH(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      { error: "README Role is Read-Only and cannot modify catalog records." },
      { status: 403 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const entity = String(body.entity || "");
  const id = Number(body.id);

  if (!id) {
    return NextResponse.json({ error: "Valid record id is required." }, { status: 400 });
  }

  if (entity === "package") {
    const updates: Partial<typeof packages.$inferInsert> = {};
    if (typeof body.pricePhp === "number") updates.pricePhp = Math.max(0, body.pricePhp);
    if (typeof body.active === "boolean") updates.active = body.active;
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();

    const [updated] = await db
      .update(packages)
      .set(updates)
      .where(eq(packages.id, id))
      .returning();

    await recordAuditLog({
      actor: user,
      action: "PACKAGE_UPDATED",
      entityType: "package",
      entityId: id,
      summary: `Updated package "${updated?.name}" settings.`,
    });

    return NextResponse.json({ ok: true, item: updated });
  }

  if (entity === "inventory") {
    const updates: Partial<typeof inventory.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.stockCount === "number")
      updates.stockCount = Math.max(0, body.stockCount);
    if (typeof body.pricePhp === "number") updates.pricePhp = Math.max(0, body.pricePhp);
    if (typeof body.active === "boolean") updates.active = body.active;

    const [updated] = await db
      .update(inventory)
      .set(updates)
      .where(eq(inventory.id, id))
      .returning();

    await recordAuditLog({
      actor: user,
      action: "INVENTORY_UPDATED",
      entityType: "inventory",
      entityId: id,
      summary: `Updated inventory "${updated?.name}" (stock: ${updated?.stockCount}, price: ₱${updated?.pricePhp}).`,
    });

    return NextResponse.json({ ok: true, item: updated });
  }

  if (entity === "resource") {
    const updates: Partial<typeof resources.$inferInsert> = {};
    if (typeof body.status === "string") updates.status = body.status;
    if (typeof body.ratePerDayPhp === "number")
      updates.ratePerDayPhp = Math.max(0, body.ratePerDayPhp);

    const [updated] = await db
      .update(resources)
      .set(updates)
      .where(eq(resources.id, id))
      .returning();

    await recordAuditLog({
      actor: user,
      action: "RESOURCE_UPDATED",
      entityType: "resource",
      entityId: id,
      summary: `Updated resource "${updated?.name}" status to ${updated?.status}.`,
    });

    return NextResponse.json({ ok: true, item: updated });
  }

  if (entity === "document_requirement") {
    const updates: Partial<typeof documentRequirements.$inferInsert> = {};
    if (typeof body.isRequired === "boolean") updates.isRequired = body.isRequired;
    if (typeof body.active === "boolean") updates.active = body.active;
    if (typeof body.appliesTo === "string") updates.appliesTo = body.appliesTo;
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === "string" && body.description.trim())
      updates.description = body.description.trim();

    const [updated] = await db
      .update(documentRequirements)
      .set(updates)
      .where(eq(documentRequirements.id, id))
      .returning();

    await recordAuditLog({
      actor: user,
      action: "DOC_REQUIREMENT_UPDATED",
      entityType: "document_requirement",
      entityId: id,
      summary: `Updated required document rule "${updated?.name}" (required: ${updated?.isRequired}, active: ${updated?.active}).`,
    });

    return NextResponse.json({ ok: true, item: updated });
  }

  if (entity === "user") {
    const updates: Partial<typeof users.$inferInsert> = {};
    if (typeof body.role === "string") updates.role = body.role as UserRole;
    if (typeof body.active === "boolean") updates.active = body.active;
    if (typeof body.staffTitle === "string") updates.staffTitle = body.staffTitle;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    await recordAuditLog({
      actor: user,
      action: "USER_ROLE_UPDATED",
      entityType: "user",
      entityId: id,
      summary: `Updated user "${updated?.fullName}" (role: ${updated?.role}, active: ${updated?.active}).`,
    });

    return NextResponse.json({ ok: true, item: updated });
  }

  return NextResponse.json({ error: "Unknown entity update." }, { status: 400 });
}
