import { createHmac, timingSafeEqual } from "crypto";

const RESUME_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function resumeSecret() {
  return process.env.CHECKOUT_RESUME_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function signature(orderId: string, expiresAtMs: number) {
  const secret = resumeSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`${orderId}.${expiresAtMs}`).digest("base64url");
}

export function checkoutResumeExpiry(now = Date.now()) {
  return new Date(now + RESUME_TTL_MS);
}

export function createCheckoutResumeToken(orderId: string, expiresAt: string | Date) {
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) return null;
  const signed = signature(orderId, expiresAtMs);
  return signed ? `${orderId}.${expiresAtMs}.${signed}` : null;
}

export function verifyCheckoutResumeToken(token: string, now = Date.now()) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [orderId, rawExpiry, provided] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(orderId || "")) return null;
  const expiresAtMs = Number(rawExpiry);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) return null;
  const expected = signature(orderId, expiresAtMs);
  if (!expected || !provided) return null;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, providedBuffer)) return null;
  return { orderId, expiresAt: new Date(expiresAtMs).toISOString() };
}
