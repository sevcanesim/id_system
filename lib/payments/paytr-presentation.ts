import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const PAYTR_PRESENTATION_COOKIE = "yenomi-paytr-presentation";
const PAYTR_PRESENTATION_AAD = Buffer.from("yenomi:paytr:presentation:v1", "utf8");
const PAYTR_RESULT_AAD = Buffer.from("yenomi:paytr:result:v1", "utf8");
const ATTEMPT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET_RE = /^[A-Za-z0-9_-]{43}$/;
const ENCRYPTION_KEY_RE = /^[A-Za-z0-9_-]{43}$/;

function encryptionKey(value = process.env.PAYTR_PRESENTATION_ENCRYPTION_KEY) {
  const serialized = String(value || "").trim();
  if (!ENCRYPTION_KEY_RE.test(serialized)) throw new Error("PAYTR_PRESENTATION_ENCRYPTION_KEY must be a 32-byte base64url value.");
  const key = Buffer.from(serialized, "base64url");
  if (key.length !== 32) throw new Error("PAYTR_PRESENTATION_ENCRYPTION_KEY must be a 32-byte base64url value.");
  return key;
}

function seal(value: string, aad: Buffer, keyValue?: string) {
  const plaintext = Buffer.from(value, "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyValue), iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function open(ciphertext: string, aad: Buffer, keyValue?: string) {
  const [encodedIv, encodedTag, encodedPayload, ...rest] = ciphertext.split(".");
  if (!encodedIv || !encodedTag || !encodedPayload || rest.length) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(keyValue), Buffer.from(encodedIv, "base64url"));
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encodedPayload, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function sealPaytrPresentationToken(token: string, keyValue?: string) {
  return seal(token, PAYTR_PRESENTATION_AAD, keyValue);
}

export function openPaytrPresentationToken(ciphertext: string, keyValue?: string) {
  return open(ciphertext, PAYTR_PRESENTATION_AAD, keyValue);
}

export function createPaytrResultReference(orderId: string, now = Date.now(), keyValue?: string) {
  if (!ATTEMPT_ID_RE.test(orderId)) throw new Error("Invalid order id.");
  return seal(JSON.stringify({ orderId, expiresAt: now + 45 * 60 * 1000 }), PAYTR_RESULT_AAD, keyValue);
}

export function resolvePaytrResultReference(value: string, now = Date.now(), keyValue?: string) {
  const plaintext = open(value, PAYTR_RESULT_AAD, keyValue);
  if (!plaintext) return null;
  try {
    const payload = JSON.parse(plaintext) as { orderId?: unknown; expiresAt?: unknown };
    if (typeof payload.orderId !== "string" || !ATTEMPT_ID_RE.test(payload.orderId)) return null;
    if (!Number.isFinite(payload.expiresAt) || Number(payload.expiresAt) <= now) return null;
    return { orderId: payload.orderId, expiresAt: new Date(Number(payload.expiresAt)).toISOString() };
  } catch {
    return null;
  }
}

export function createPaytrPresentationSecret() {
  const value = randomBytes(32).toString("base64url");
  return { value, hash: hashPaytrPresentationSecret(value) };
}

export function hashPaytrPresentationSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createPaytrPresentationUrl(attemptId: string, publicSiteUrl: string) {
  if (!ATTEMPT_ID_RE.test(attemptId)) throw new Error("Invalid payment attempt id.");
  return `${publicSiteUrl}/odeme/paytr?attempt=${encodeURIComponent(attemptId)}`;
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/odeme/paytr",
    expires: expiresAt,
  };
}

export function applyPaytrPresentationCookie(
  response: NextResponse,
  input: { attemptId: string; secret: string; expiresAt: Date },
) {
  if (!ATTEMPT_ID_RE.test(input.attemptId) || !SECRET_RE.test(input.secret)) throw new Error("Invalid PayTR presentation cookie.");
  response.cookies.set({
    name: PAYTR_PRESENTATION_COOKIE,
    value: `${input.attemptId}.${input.secret}`,
    ...cookieOptions(input.expiresAt),
  });
  return response;
}

export function readPaytrPresentationSecret(request: NextRequest | { cookies: { get(name: string): { value?: string } | undefined } }, attemptId: string) {
  if (!ATTEMPT_ID_RE.test(attemptId)) return null;
  const value = request.cookies.get(PAYTR_PRESENTATION_COOKIE)?.value || "";
  const separator = value.indexOf(".");
  if (separator < 0) return null;
  const cookieAttemptId = value.slice(0, separator);
  const secret = value.slice(separator + 1);
  if (cookieAttemptId !== attemptId || !SECRET_RE.test(secret)) return null;
  return secret;
}
