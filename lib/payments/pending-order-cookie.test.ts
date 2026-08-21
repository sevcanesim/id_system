import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { applyPendingOrderCookie, PENDING_ORDER_COOKIE, readPendingOrderId, resolveRecoverOrderId } from "./pending-order-cookie";

const VALID = "550e8400-e29b-41d4-a716-446655440000";

function requestWithCookie(value: string) {
  return new NextRequest("https://yenomi.test/api/commerce/orders/pending", {
    headers: { cookie: `${PENDING_ORDER_COOKIE}=${value}` },
  });
}

describe("pending order cookie", () => {
  it("accepts a UUID and rejects garbage", () => {
    expect(readPendingOrderId(requestWithCookie(VALID))).toBe(VALID);
    expect(readPendingOrderId(requestWithCookie("not-an-order"))).toBeNull();
    expect(readPendingOrderId(new NextRequest("https://yenomi.test/"))).toBeNull();
  });

  it("sets and clears the HttpOnly cookie", () => {
    const setResponse = applyPendingOrderCookie(NextResponse.json({ ok: true }), VALID);
    expect(setResponse.cookies.get(PENDING_ORDER_COOKIE)?.value).toBe(VALID);
    const cleared = applyPendingOrderCookie(NextResponse.json({ ok: true }), null);
    expect(cleared.cookies.get(PENDING_ORDER_COOKIE)?.value).toBe("");
  });

  it("uses the cookie when it matches the body, and still returns a body UUID when the cookie is absent", () => {
    expect(resolveRecoverOrderId(VALID, VALID)).toEqual({ orderId: VALID, mismatch: false });
    expect(resolveRecoverOrderId(null, VALID)).toEqual({ orderId: VALID, mismatch: false });
    expect(resolveRecoverOrderId(VALID, null)).toEqual({ orderId: VALID, mismatch: false });
  });

  it("rejects a cookie/body mismatch instead of settling the other order", () => {
    expect(resolveRecoverOrderId(VALID, "11111111-1111-4111-8111-111111111111")).toEqual({ orderId: null, mismatch: true });
  });
});
