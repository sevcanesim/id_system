export const INDIVIDUAL_PRODUCT_PURCHASE_HREF = "/urunler/nfc-kart?paket=individual&reason=access-required";

type IndividualProductAccessInput = {
  requiresProductAccess: boolean;
  entitlementLookupSucceeded: boolean;
  corporateMembershipLookupSucceeded: boolean;
  hasActiveEntitlement: boolean;
  hasRenewalEntitlement: boolean;
  hasPendingEntitlement: boolean;
  hasCorporateMembership: boolean;
};

/**
 * An account registration alone is intentionally not a card workspace grant.
 * Account settings remain available, while product surfaces route a completely
 * unpurchased individual account to the card purchase flow. Corporate members
 * keep their own card workspace even without an individual entitlement.
 */
export function needsIndividualProductPurchase(input: IndividualProductAccessInput): boolean {
  if (!input.requiresProductAccess || !input.entitlementLookupSucceeded || !input.corporateMembershipLookupSucceeded) return false;
  if (input.hasCorporateMembership) return false;
  return !input.hasActiveEntitlement && !input.hasRenewalEntitlement && !input.hasPendingEntitlement;
}
