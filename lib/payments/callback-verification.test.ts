import { describe, expect, it } from "vitest";
import { verifyIyzicoCheckoutResult } from "./callback-verification";

const attempt = {
  orderId: "order-1",
  amountKurus: 79900,
  currency: "TRY",
  conversationId: "conv-1",
};

const paidResult = {
  status: "success",
  paymentStatus: "SUCCESS",
  paidPrice: "799.00",
  currency: "TRY",
  basketId: "order-1",
  conversationId: "conv-1",
};

describe("verifyIyzicoCheckoutResult", () => {
  it("accepts a matching success payload", () => {
    expect(verifyIyzicoCheckoutResult(attempt, paidResult)).toBe(true);
  });

  it("rejects null, unpaid, amount, currency, basket and conversation drift", () => {
    expect(verifyIyzicoCheckoutResult(attempt, null)).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, paymentStatus: "FAILURE" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, paidPrice: "798.00" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, currency: "USD" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, basketId: "other-order" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, conversationId: "other-conv" })).toBe(false);
  });
});
