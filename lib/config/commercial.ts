import {
  BUSINESS_SEAT_PACKS,
  CORPORATE_PACKAGE_LADDER,
  CORPORATE_PACKAGE_PRODUCT_SLUG,
  corporatePackageSku,
  ADDITIONAL_CARD_PLAN,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_PLAN,
  INDIVIDUAL_PREMIUM_RENEWAL_PLAN,
  INDIVIDUAL_PREMIUM_UPGRADE_PLAN,
  isCorporatePackageSku,
} from "../commerce/packages";

const corp10 = CORPORATE_PACKAGE_LADDER.find((row) => row.code === "CORP-10")!;
const corp25 = CORPORATE_PACKAGE_LADDER.find((row) => row.code === "CORP-25")!;
const corp50 = CORPORATE_PACKAGE_LADDER.find((row) => row.code === "CORP-50")!;

export const COMMERCIAL_PRICING = {
  YENOMI_ID_INITIAL: { sku: "YENOMI-NFC-CARD-ANNUAL", priceKurus: 79_900, billing: "ONE_TIME_WITH_INCLUDED_TERM" },
  YENOMI_ID_PREMIUM: { sku: "YENOMI-NFC-PREMIUM-ANNUAL", priceKurus: 125_000, billing: "ONE_TIME_WITH_INCLUDED_TERM" },
  YENOMI_ID_RENEWAL: { sku: "YENOMI-DIGITAL-RENEWAL-ANNUAL", priceKurus: 29_900, billing: "YEARLY_RENEWAL" },
  YENOMI_ID_PREMIUM_RENEWAL: { sku: "YENOMI-PREMIUM-RENEWAL-ANNUAL", priceKurus: 59_900, billing: "YEARLY_RENEWAL" },
  YENOMI_ID_PREMIUM_UPGRADE: { sku: "YENOMI-PREMIUM-UPGRADE", priceKurus: 45_100, billing: "ONE_TIME" },
  ADDITIONAL_CARD: { sku: "YENOMI-NFC-EXTRA", priceKurus: 39_900, billing: "ONE_TIME" },
  REPLACEMENT_CARD: { sku: "YENOMI-NFC-REPLACEMENT", priceKurus: 34_900, billing: "ONE_TIME" },
  BUSINESS_STARTER: { code: corp10.code, seats: corp10.seats, priceKurus: corp10.priceKurus },
  BUSINESS_GROWTH: { code: corp25.code, seats: corp25.seats, priceKurus: corp25.priceKurus },
  BUSINESS: { code: corp50.code, seats: corp50.seats, priceKurus: corp50.priceKurus },
  ENTERPRISE: { code: "ENTERPRISE", seats: null, priceKurus: null },
  BUSINESS_SEAT_PACKS,
  DOMESTIC_SHIPPING: { priceKurus: 0, country: "TR", includedForPhysicalProducts: true },
  SERVICE: { termDays: 365, graceDays: 7, activationLinkDays: 7, activationResendLinkHours: 24, activationMaxDelayDays: 30 },
} as const;

export const COMMERCIAL_SKUS = {
  INITIAL: COMMERCIAL_PRICING.YENOMI_ID_INITIAL.sku,
  PREMIUM: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.sku,
  RENEWAL: COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.sku,
  PREMIUM_RENEWAL: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.sku,
  PREMIUM_UPGRADE: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.sku,
  ADDITIONAL_CARD: COMMERCIAL_PRICING.ADDITIONAL_CARD.sku,
  REPLACEMENT_CARD: COMMERCIAL_PRICING.REPLACEMENT_CARD.sku,
} as const;

export function isPhysicalBundleSku(sku: string | undefined): boolean {
  return sku === COMMERCIAL_SKUS.INITIAL || sku === COMMERCIAL_SKUS.PREMIUM;
}

export function isRenewalSku(sku: string | undefined): boolean {
  return sku === COMMERCIAL_SKUS.RENEWAL || sku === COMMERCIAL_SKUS.PREMIUM_RENEWAL;
}

export function isPremiumUpgradeSku(sku: string | undefined): boolean {
  return sku === COMMERCIAL_SKUS.PREMIUM_UPGRADE;
}

export function isDigitalOnlySku(sku: string | undefined): boolean {
  return isRenewalSku(sku) || isPremiumUpgradeSku(sku);
}

export { CORPORATE_PACKAGE_PRODUCT_SLUG, corporatePackageSku, isCorporatePackageSku };

export const CORPORATE_PACKAGE_OFFERS = CORPORATE_PACKAGE_LADDER.map((row) => ({
  code: row.code,
  sku: corporatePackageSku(row.code),
  priceKurus: row.priceKurus,
  seats: row.seats,
}));

/** iyzico still requires a billing street; digital carts never collect one. */
export function digitalServiceBillingAddress(city: string, existingAddress = ""): string {
  const trimmed = existingAddress.trim();
  if (trimmed.length >= 8) return trimmed;
  return `Dijital hizmet faturası — ${city.trim() || "Türkiye"}`;
}

export const INDIVIDUAL_RENEWAL_MESSAGE = "Kartınız sizin. Yıllık yenilemede yeni kart almanız gerekmez.";
export const INDIVIDUAL_PREMIUM_RENEWAL_MESSAGE = "Kartınız sizin. Premium yenilemede yeni kart gönderilmez. Kullanılmayan Network Mail krediniz bir sonraki yıla taşınır.";
export const INDIVIDUAL_PREMIUM_UPGRADE_MESSAGE = "Mevcut kartınız ve süreniz korunur. 100 Network Mail bu dönem için eklenir; ikinci kart gönderilmez.";

export function formatCommercialTry(amountKurus: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amountKurus / 100);
}

export const COMMERCIAL_COPY = {
  initialPrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus),
  premiumPrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus),
  renewalPrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus),
  premiumRenewalPrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.priceKurus),
  premiumUpgradePrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.priceKurus),
  additionalCardPrice: formatCommercialTry(COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus),
  replacementCardPrice: formatCommercialTry(COMMERCIAL_PRICING.REPLACEMENT_CARD.priceKurus),
} as const;

if (COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus !== INDIVIDUAL_PLAN.priceKurus) {
  throw new Error("Individual listing price drifted from the package ladder.");
}
if (COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus !== ADDITIONAL_CARD_PLAN.priceKurus) {
  throw new Error("Spare-card listing price drifted from the package ladder.");
}
if (COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus !== INDIVIDUAL_PREMIUM_PLAN.priceKurus) {
  throw new Error("Premium listing price drifted from the package ladder.");
}
if (COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.priceKurus !== INDIVIDUAL_PREMIUM_RENEWAL_PLAN.priceKurus) {
  throw new Error("Premium renewal price drifted from the package ladder.");
}
if (COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.priceKurus !== INDIVIDUAL_PREMIUM_UPGRADE_PLAN.priceKurus) {
  throw new Error("Premium upgrade price drifted from the package ladder.");
}
