import { describe, expect, it } from "vitest";

import { needsIndividualProductPurchase } from "./individual-portal-access";

const base = {
  requiresProductAccess: true,
  entitlementLookupSucceeded: true,
  corporateMembershipLookupSucceeded: true,
  hasActiveEntitlement: false,
  hasRenewalEntitlement: false,
  hasPendingEntitlement: false,
  hasCorporateMembership: false,
};

describe("needsIndividualProductPurchase", () => {
  it("marks a portal-only individual account as requiring card purchase", () => {
    expect(needsIndividualProductPurchase(base)).toBe(true);
  });

  it("keeps account settings, active customers, renewals and pending activation out of the purchase gate", () => {
    expect(needsIndividualProductPurchase({ ...base, requiresProductAccess: false })).toBe(false);
    expect(needsIndividualProductPurchase({ ...base, hasActiveEntitlement: true })).toBe(false);
    expect(needsIndividualProductPurchase({ ...base, hasRenewalEntitlement: true })).toBe(false);
    expect(needsIndividualProductPurchase({ ...base, hasPendingEntitlement: true })).toBe(false);
  });

  it("does not redirect a corporate member from their own card workspace", () => {
    expect(needsIndividualProductPurchase({ ...base, hasCorporateMembership: true })).toBe(false);
  });

  it("fails open when the entitlement service cannot be verified", () => {
    expect(needsIndividualProductPurchase({ ...base, entitlementLookupSucceeded: false })).toBe(false);
    expect(needsIndividualProductPurchase({ ...base, corporateMembershipLookupSucceeded: false })).toBe(false);
  });
});
