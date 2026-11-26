import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionUser,
  hashPassword,
  verifyPassword,
  recordAuditLog,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { ROLE_DIRECTORY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();

  const demoAccounts = Object.values(ROLE_DIRECTORY).map((r) => ({
    role: r.role,
    titleEn: r.titleEn,
    titleFil: r.titleFil,
    email: r.demoEmail,
    summary: r.summary,
  }));

  return NextResponse.json({ user, demoAccounts });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const cookieStore = await cookies();

  if (action === "logout") {
    const currentUser = await getSessionUser();
    if (currentUser) {
      await recordAuditLog({
        actor: currentUser,
        action: "USER_LOGOUT",
        entityType: "user",
        entityId: currentUser.id,
        summary: `${currentUser.fullName} (${currentUser.role}) signed out.`,
      });
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ ok: true, user: null });
  }

  if (action === "demo_switch") {
    const email = String(body.email || "").trim().toLowerCase();
    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!target || !target.active) {
      return NextResponse.json(
        { error: "Demo account not found or inactive." },
        { status: 404 }
      );
    }

    const token = createSessionToken(target.id, target.role);
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    const sessionUser = {
      id: target.id,
      email: target.email,
      fullName: target.fullName,
      role: target.role,
      staffTitle: target.staffTitle,
      preferredLanguage: target.preferredLanguage,
    };

    await recordAuditLog({
      actor: sessionUser,
      action: "DEMO_ROLE_SWITCH",
      entityType: "user",
      entityId: target.id,
      summary: `Switched active session to demo role: ${target.role} (${target.fullName}).`,
    });

    return NextResponse.json({ ok: true, user: sessionUser });
  }

  if (action === "login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both your email address and password." },
        { status: 400 }
      );
    }

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!found || !found.active || !verifyPassword(password, found.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password. You may also use a demo role button below." },
        { status: 401 }
      );
    }

    const token = createSessionToken(found.id, found.role);
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    const sessionUser = {
      id: found.id,
      email: found.email,
      fullName: found.fullName,
      role: found.role,
      staffTitle: found.staffTitle,
      preferredLanguage: found.preferredLanguage,
    };

    await recordAuditLog({
      actor: sessionUser,
      action: "USER_LOGIN",
      entityType: "user",
      entityId: found.id,
      summary: `${found.fullName} signed in with role ${found.role}.`,
    });

    return NextResponse.json({ ok: true, user: sessionUser });
  }

  if (action === "register") {
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const privacyConsent = Boolean(body.privacyConsent);
    const preferredLanguage = body.preferredLanguage === "fil" ? "fil" : "en";

    if (!fullName || !email || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Please provide your full name, a valid email address, and a password of at least 6 characters.",
        },
        { status: 400 }
      );
    }

    if (!privacyConsent) {
      return NextResponse.json(
        {
          error:
            "Please acknowledge the Data Privacy Act of 2012 (RA 10173) privacy notice to create an account.",
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashPassword(password),
        fullName,
        role: "client",
        staffTitle: "Family Representative",
        preferredLanguage,
        privacyConsentAt: new Date(),
        active: true,
      })
      .returning();

    const token = createSessionToken(created.id, created.role);
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    const sessionUser = {
      id: created.id,
      email: created.email,
      fullName: created.fullName,
      role: created.role,
      staffTitle: created.staffTitle,
      preferredLanguage: created.preferredLanguage,
    };

    await recordAuditLog({
      actor: sessionUser,
      action: "CLIENT_REGISTERED",
      entityType: "user",
      entityId: created.id,
      summary: `New family client account created for ${created.fullName} with RA 10173 consent.`,
    });

    return NextResponse.json({ ok: true, user: sessionUser });
  }

  if (action === "update_language") {
    const lang = body.language === "fil" ? "fil" : "en";
    const user = await getSessionUser();
    if (user && user.role !== "readme") {
      await db
        .update(users)
        .set({ preferredLanguage: lang })
        .where(eq(users.id, user.id));
    }
    return NextResponse.json({ ok: true, language: lang });
  }

  return NextResponse.json({ error: "Unsupported auth action." }, { status: 400 });
}
