import { describe, expect, it } from "vitest";
import { COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "../config/commercial";
import { createCheckoutFingerprint } from "./idempotency";

const base = {
  items: [{ productSlug: "nfc-kart", variantSku: COMMERCIAL_SKUS.INITIAL, quantity: 1 }],
  email: "ada@example.com",
  totalKurus: COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus,
  shipping: { city: "İzmir" },
  consents: { privacyVersion: "1" },
};

describe("createCheckoutFingerprint", () => {
  it("changes when the identity number changes on an otherwise identical checkout", () => {
    const first = createCheckoutFingerprint({
      ...base,
      customer: { name: "Ada Yenomi", phone: "+905551112233", identityType: "TR", identityNumber: "10000000146" },
    });
    const second = createCheckoutFingerprint({
      ...base,
      customer: { name: "Ada Yenomi", phone: "+905551112233", identityType: "TR", identityNumber: "10000000147" },
    });
    expect(first).not.toBe(second);
  });

  it("stays stable for the same identity-bound payload", () => {
    const customer = { name: "Ada Yenomi", phone: "+905551112233", identityType: "TR", identityNumber: "10000000146" };
    expect(createCheckoutFingerprint({ ...base, customer })).toBe(createCheckoutFingerprint({ ...base, customer }));
  });
});
