import { describe, expect, it } from "vitest";
import { COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "./commercial";
import { listingPriceKurus, NFC_PRODUCT, selectInitialOfferVariant } from "./product";

describe("selectInitialOfferVariant", () => {
  it("prefers the canonical initial SKU even when extra-card is first", () => {
    const variants = [
      { sku: COMMERCIAL_SKUS.ADDITIONAL_CARD, priceKurus: COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus, metadata: { fulfillment_kind: "ADDITIONAL_CARD" } },
      { sku: COMMERCIAL_SKUS.INITIAL, priceKurus: COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus, metadata: { fulfillment_kind: "INITIAL_BUNDLE" } },
      { sku: COMMERCIAL_SKUS.RENEWAL, priceKurus: COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus, metadata: { fulfillment_kind: "DIGITAL_RENEWAL" } },
    ];
    expect(selectInitialOfferVariant(variants)?.sku).toBe(COMMERCIAL_SKUS.INITIAL);
    expect(listingPriceKurus(variants)).toBe(COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus);
  });

  it("does not fall back to the first unordered variant", () => {
    const variants = [
      { sku: COMMERCIAL_SKUS.ADDITIONAL_CARD, priceKurus: 39_900, metadata: { fulfillment_kind: "ADDITIONAL_CARD" } },
    ];
    expect(selectInitialOfferVariant(variants)).toBeUndefined();
    expect(listingPriceKurus(variants)).toBe(NFC_PRODUCT.unitPriceKurus);
    expect(listingPriceKurus(variants)).toBe(79_900);
  });

  it("keeps public listing on the 799 SKU even if Premium is also INITIAL_BUNDLE", () => {
    const variants = [
      { sku: COMMERCIAL_SKUS.PREMIUM, priceKurus: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus, metadata: { fulfillment_kind: "INITIAL_BUNDLE" } },
      { sku: COMMERCIAL_SKUS.INITIAL, priceKurus: COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus, metadata: { fulfillment_kind: "INITIAL_BUNDLE" } },
    ];
    expect(selectInitialOfferVariant(variants)?.sku).toBe(COMMERCIAL_SKUS.INITIAL);
    expect(listingPriceKurus(variants)).toBe(79_900);
  });
});
