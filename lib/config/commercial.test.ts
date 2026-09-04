import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_SKUS,
  corporatePackageSku,
  requiresPortalAccountSku,
} from "./commercial";

describe("requiresPortalAccountSku", () => {
  it("requires an account for portal and account-bound card purchases", () => {
    expect(requiresPortalAccountSku(COMMERCIAL_SKUS.INITIAL)).toBe(true);
    expect(requiresPortalAccountSku(COMMERCIAL_SKUS.PREMIUM)).toBe(true);
    expect(requiresPortalAccountSku(COMMERCIAL_SKUS.DIGITAL)).toBe(true);
    expect(requiresPortalAccountSku(COMMERCIAL_SKUS.RENEWAL)).toBe(true);
    expect(requiresPortalAccountSku(COMMERCIAL_SKUS.PREMIUM_RENEWAL)).toBe(true);
    expect(requiresPortalAccountSku(COMMERCIAL_SKUS.PREMIUM_UPGRADE)).toBe(true);
    expect(requiresPortalAccountSku(COMMERCIAL_SKUS.ADDITIONAL_CARD)).toBe(true);
    expect(requiresPortalAccountSku(COMMERCIAL_SKUS.REPLACEMENT_CARD)).toBe(true);
    expect(requiresPortalAccountSku(corporatePackageSku("CORP-10"))).toBe(true);
  });

  it("keeps a future physical-only SKU eligible for guest checkout", () => {
    expect(requiresPortalAccountSku("FUTURE-PHYSICAL-ONLY")).toBe(false);
  });
});
