import { describe, expect, it } from "vitest";
import { sanitizeProviderPayload } from "./sanitize-provider-payload";

describe("sanitizeProviderPayload", () => {
  it("keeps only non-identifying payment state", () => {
    expect(sanitizeProviderPayload({
      provider: "PAYTR",
      status: "failed",
      currency: "TL",
      errorCode: "provider rejected customer@example.com",
      merchantOid: "PTsensitive-reference",
      paymentId: "provider-payment-id",
      conversationId: "conversation-id",
      errorMessage: "Raw provider response with customer@example.com",
    })).toEqual({
      provider: "PAYTR",
      status: "failed",
      paymentStatus: null,
      paidPrice: null,
      price: null,
      currency: "TL",
      errorCode: "PROVIDER_REJECTED_CUSTOMER_EXAMPLE_COM",
    });
  });

  it("rejects a payload that is not an object", () => {
    expect(sanitizeProviderPayload(null)).toBeNull();
    expect(sanitizeProviderPayload("failed")).toBeNull();
  });
});
