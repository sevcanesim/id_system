import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const PENDING_ORDER_COOKIE = "yenomi-pending-order";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_RE = /^[A-Za-z0-9_-]{43}$/;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SIGNING_CONTEXT = "yenomi:pending-order:v1";

function cookieBase() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

function signingKey(value = process.env.PAYTR_PRESENTATION_ENCRYPTION_KEY) {
  const serialized = String(value || "").trim();
  return /^[A-Za-z0-9_-]{43}$/.test(serialized) ? serialized : null;
}

function signatureForOrder(orderId: string, key: string) {
  return createHmac("sha256", key)
    .update(`${SIGNING_CONTEXT}:${orderId}`)
    .digest("base64url");
}

export function serializePendingOrderCookie(orderId: string, keyValue?: string) {
  if (!UUID_RE.test(orderId)) return null;
  const key = signingKey(keyValue);
  if (!key) return null;
  return `${orderId}.${signatureForOrder(orderId, key)}`;
}

export function parsePendingOrderCookie(value: string, keyValue?: string) {
  const separator = value.indexOf(".");
  if (separator < 0) return null;
  const orderId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const key = signingKey(keyValue);
  if (!UUID_RE.test(orderId) || !SIGNATURE_RE.test(signature) || !key) return null;
  const expected = Buffer.from(signatureForOrder(orderId, key));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided) ? orderId : null;
}

export function readPendingOrderId(request: NextRequest): string | null {
  const value = request.cookies.get(PENDING_ORDER_COOKIE)?.value || "";
  return parsePendingOrderCookie(value);
}

export function applyPendingOrderCookie(response: NextResponse, orderId: string | null) {
  const serialized = orderId ? serializePendingOrderCookie(orderId) : null;
  if (serialized) {
    response.cookies.set({
      name: PENDING_ORDER_COOKIE,
      value: serialized,
      ...cookieBase(),
      maxAge: MAX_AGE_SECONDS,
    });
    return response;
  }
  response.cookies.set({
    name: PENDING_ORDER_COOKIE,
    value: "",
    ...cookieBase(),
    maxAge: 0,
  });
  return response;
}

export function resolveRecoverOrderId(cookieOrderId: string | null, bodyOrderId: string | null): { orderId: string | null; mismatch: boolean } {
  const cookie = cookieOrderId && UUID_RE.test(cookieOrderId) ? cookieOrderId : null;
  const body = bodyOrderId && UUID_RE.test(bodyOrderId) ? bodyOrderId : null;
  if (cookie && body && cookie !== body) return { orderId: null, mismatch: true };
  return { orderId: cookie || body, mismatch: false };
}
