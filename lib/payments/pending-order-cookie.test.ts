import { describe, expect, it } from "vitest";
import { parsePendingOrderCookie, serializePendingOrderCookie } from "./pending-order-cookie";

const orderId = "3b3c451e-487d-4c73-9128-3fbf0a55d5a1";
const key = "A".repeat(43);

describe("pending order cookie", () => {
  it("accepts a server-signed order reference", () => {
    const serialized = serializePendingOrderCookie(orderId, key);
    expect(serialized).toBeTruthy();
    expect(parsePendingOrderCookie(serialized!, key)).toBe(orderId);
  });

  it("rejects a raw or altered order reference", () => {
    const serialized = serializePendingOrderCookie(orderId, key)!;
    expect(parsePendingOrderCookie(orderId, key)).toBeNull();
    expect(parsePendingOrderCookie(`${orderId.slice(0, -1)}2${serialized.slice(serialized.indexOf("."))}`, key)).toBeNull();
  });
});
