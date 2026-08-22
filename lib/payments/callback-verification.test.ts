import { describe, expect, it } from "vitest";
import { isTerminalIyzicoDecline, verifyIyzicoCheckoutResult } from "./callback-verification";

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

  it("accepts price when paidPrice is absent", () => {
    const { paidPrice: _paidPrice, ...rest } = paidResult;
    expect(verifyIyzicoCheckoutResult(attempt, { ...rest, price: "799.00" })).toBe(true);
  });

  it("rejects null, undefined, missing fields, unpaid, amount, currency, basket and conversation drift", () => {
    expect(verifyIyzicoCheckoutResult(attempt, null)).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, undefined)).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, {})).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, status: "failure" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, paymentStatus: "FAILURE" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, paidPrice: "798.00" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, currency: "USD" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, currency: "" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, basketId: "other-order" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, basketId: "" })).toBe(false);
    expect(verifyIyzicoCheckoutResult(attempt, { ...paidResult, conversationId: "other-conv" })).toBe(false);
  });
});

describe("isTerminalIyzicoDecline", () => {
  it("is true only for an explicit failed paymentStatus", () => {
    expect(isTerminalIyzicoDecline({ paymentStatus: "FAILURE" })).toBe(true);
    expect(isTerminalIyzicoDecline({ paymentStatus: "FAILED" })).toBe(true);
    expect(isTerminalIyzicoDecline({ paymentStatus: "INIT_THREEDS" })).toBe(false);
    expect(isTerminalIyzicoDecline({ paymentStatus: "SUCCESS" })).toBe(false);
    expect(isTerminalIyzicoDecline(null)).toBe(false);
    expect(isTerminalIyzicoDecline({})).toBe(false);
  });
});
