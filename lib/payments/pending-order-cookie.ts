import type { NextRequest, NextResponse } from "next/server";

export const PENDING_ORDER_COOKIE = "yenomi-pending-order";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function cookieBase() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function readPendingOrderId(request: NextRequest): string | null {
  const value = request.cookies.get(PENDING_ORDER_COOKIE)?.value || "";
  return UUID_RE.test(value) ? value : null;
}

export function applyPendingOrderCookie(response: NextResponse, orderId: string | null) {
  if (orderId && UUID_RE.test(orderId)) {
    response.cookies.set({
      name: PENDING_ORDER_COOKIE,
      value: orderId,
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

/** Resolves which UUID to consider. Does not authorize settlement — see recover-authorization. */
export function resolveRecoverOrderId(cookieOrderId: string | null, bodyOrderId: string | null): { orderId: string | null; mismatch: boolean } {
  const cookie = cookieOrderId && UUID_RE.test(cookieOrderId) ? cookieOrderId : null;
  const body = bodyOrderId && UUID_RE.test(bodyOrderId) ? bodyOrderId : null;
  if (cookie && body && cookie !== body) return { orderId: null, mismatch: true };
  return { orderId: cookie || body, mismatch: false };
}
