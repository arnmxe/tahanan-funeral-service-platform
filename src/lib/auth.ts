import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, users, auditLogs, type UserRole } from "@/db";

export const SESSION_COOKIE_NAME = "tkp_session_v1";

function getSecret(): string {
  return process.env.SESSION_SECRET || "tkp-ra10173-session-secret-key-2026-ph";
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  const derived = crypto.scryptSync(plain, salt, 64);
  const storedBuf = Buffer.from(hashHex, "hex");
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

interface TokenPayload {
  uid: number;
  role: UserRole;
  exp: number;
}

export function createSessionToken(userId: number, role: UserRole): string {
  const payload: TokenPayload = {
    uid: userId,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(encoded)
      .digest("base64url");
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as TokenPayload;
    if (!parsed.uid || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  staffTitle: string | null;
  preferredLanguage: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) return null;
    const payload = verifySessionToken(raw);
    if (!payload) return null;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.uid))
      .limit(1);

    if (!user || !user.active) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      staffTitle: user.staffTitle,
      preferredLanguage: user.preferredLanguage,
    };
  } catch {
    return null;
  }
}

export function isReadOnlyRole(user: SessionUser | null): boolean {
  return user?.role === "readme";
}

export async function recordAuditLog(params: {
  actor: SessionUser | null;
  action: string;
  entityType: string;
  entityId: string | number;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUserId: params.actor?.id ?? null,
      actorName: params.actor?.fullName ?? "Public Visitor / System",
      actorRole: params.actor?.role ?? "guest",
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      summary: params.summary,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Non-blocking audit logging fallback
  }
}

export function generatePaymongoTestSignature(
  bookingRef: string,
  amountPhp: number,
  method: string
): { sessionId: string; signatureHash: string } {
  const nonce = crypto.randomBytes(6).toString("hex");
  const sessionId = `cs_test_pm_${bookingRef.replace(/[^A-Z0-9]/gi, "")}_${nonce}`;
  const webhookSecret =
    process.env.PAYMONGO_WEBHOOK_SECRET || "whsec_test_kapayapaan_sandbox_2026";
  const signatureHash = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${sessionId}:${amountPhp}:${method}:paid`)
    .digest("hex");
  return { sessionId, signatureHash };
}

export function verifyPaymongoTestSignature(
  sessionId: string,
  amountPhp: number,
  method: string,
  signatureHash: string
): boolean {
  const webhookSecret =
    process.env.PAYMONGO_WEBHOOK_SECRET || "whsec_test_kapayapaan_sandbox_2026";
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${sessionId}:${amountPhp}:${method}:paid`)
    .digest("hex");
  if (expected.length !== signatureHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHash));
}
