import { describe, expect, it } from "vitest";
import { sanitizeProviderPayload } from "./sanitize-provider-payload";

describe("sanitizeProviderPayload", () => {
  it("keeps settlement fields and drops buyer, card and token material", () => {
    const stored = sanitizeProviderPayload({
      status: "success",
      paymentStatus: "SUCCESS",
      paidPrice: "799.00",
      price: "799.00",
      currency: "TRY",
      basketId: "order-1",
      conversationId: "conv-1",
      paymentId: "pay-1",
      errorCode: null,
      errorMessage: null,
      token: "checkout-token",
      binNumber: "454360",
      lastFourDigits: "0008",
      cardType: "CREDIT_CARD",
      buyer: { email: "ada@example.com", identityNumber: "10000000146", gsmNumber: "+905551112233" },
    });
    expect(stored).toEqual({
      status: "success",
      paymentStatus: "SUCCESS",
      paidPrice: "799.00",
      price: "799.00",
      currency: "TRY",
      basketId: "order-1",
      conversationId: "conv-1",
      paymentId: "pay-1",
      errorCode: null,
      errorMessage: null,
    });
    expect(JSON.stringify(stored)).not.toMatch(/ada@example|10000000146|0008|checkout-token|454360/);
  });
});
