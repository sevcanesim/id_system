import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const RESUME_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESUME_CODE_TTL_MS = 15 * 60 * 1000;
const CONTINUATION_TTL_MS = 10 * 60 * 1000;

export const CHECKOUT_CONTINUATION_COOKIE = "yenomi-checkout-continuation";

function resumeSecret() {
  return process.env.CHECKOUT_RESUME_SECRET || "";
}

function sign(value: string) {
  const secret = resumeSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function signaturesMatch(expected: string, provided: string) {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export function checkoutResumeSessionExpiry(now = Date.now()) {
  return new Date(now + RESUME_SESSION_TTL_MS);
}

export function checkoutResumeCodeExpiry(now = Date.now()) {
  return new Date(now + RESUME_CODE_TTL_MS);
}

export function createCheckoutResumeCode() {
  return randomBytes(32).toString("base64url");
}

export function hashCheckoutResumeCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function createCheckoutContinuation(orderId: string, now = Date.now()) {
  const expiresAtMs = now + CONTINUATION_TTL_MS;
  const payload = `${orderId}.${expiresAtMs}`;
  const signature = sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

export function verifyCheckoutContinuation(value: string, now = Date.now()) {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [orderId, rawExpiry, providedSignature] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(orderId || "")) return null;
  const expiresAtMs = Number(rawExpiry);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now || !providedSignature) return null;
  const expectedSignature = sign(`${orderId}.${expiresAtMs}`);
  if (!expectedSignature || !signaturesMatch(expectedSignature, providedSignature)) return null;
  return { orderId, expiresAt: new Date(expiresAtMs).toISOString() };
}
