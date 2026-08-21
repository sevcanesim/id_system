import { describe, expect, it } from "vitest";
import { ownerMayRecover, resolveRecoverIntent } from "./recover-authorization";

const ORDER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "11111111-1111-4111-8111-111111111111";
const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("resolveRecoverIntent", () => {
  it("treats cookie possession as authorization even without a body id", () => {
    expect(resolveRecoverIntent(ORDER, null)).toEqual({ kind: "cookie", orderId: ORDER });
    expect(resolveRecoverIntent(ORDER, ORDER)).toEqual({ kind: "cookie", orderId: ORDER });
  });

  it("does not grant settlement from a body UUID alone", () => {
    expect(resolveRecoverIntent(null, ORDER)).toEqual({ kind: "owner-required", orderId: ORDER });
  });

  it("rejects a cookie/body mismatch instead of settling either order", () => {
    expect(resolveRecoverIntent(ORDER, OTHER)).toEqual({ kind: "mismatch" });
  });

  it("rejects an empty recover", () => {
    expect(resolveRecoverIntent(null, null)).toEqual({ kind: "missing" });
    expect(resolveRecoverIntent(null, "not-a-uuid")).toEqual({ kind: "missing" });
  });
});

describe("ownerMayRecover", () => {
  it("allows only the authenticated owner", () => {
    expect(ownerMayRecover(USER, USER)).toBe(true);
    expect(ownerMayRecover(OTHER, USER)).toBe(false);
  });

  it("never allows a guest (unclaimed) order without the cookie", () => {
    expect(ownerMayRecover(null, USER)).toBe(false);
    expect(ownerMayRecover("", USER)).toBe(false);
  });
});
