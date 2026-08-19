import { BUSINESS_SEAT_PACKS, CORPORATE_PACKAGE_LADDER, INDIVIDUAL_PREMIUM_PLAN } from "../commerce/packages";

const corp10 = CORPORATE_PACKAGE_LADDER.find((row) => row.code === "CORP-10")!;
const corp25 = CORPORATE_PACKAGE_LADDER.find((row) => row.code === "CORP-25")!;
const corp50 = CORPORATE_PACKAGE_LADDER.find((row) => row.code === "CORP-50")!;

export const COMMERCIAL_PRICING = {
  YENOMI_ID_INITIAL: { sku: "YENOMI-NFC-CARD-ANNUAL", priceKurus: 79_900, billing: "ONE_TIME_WITH_INCLUDED_TERM" },
  YENOMI_ID_PREMIUM: { sku: "YENOMI-NFC-PREMIUM-ANNUAL", billing: "ONE_TIME_WITH_INCLUDED_TERM", priceKurus: INDIVIDUAL_PREMIUM_PLAN.priceKurus },
  YENOMI_ID_RENEWAL: { sku: "YENOMI-DIGITAL-RENEWAL-ANNUAL", priceKurus: 29_900, billing: "YEARLY_RENEWAL" },
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
  ADDITIONAL_CARD: COMMERCIAL_PRICING.ADDITIONAL_CARD.sku,
  REPLACEMENT_CARD: COMMERCIAL_PRICING.REPLACEMENT_CARD.sku,
} as const;


export function isRenewalSku(sku: string | undefined): boolean {
  return sku === COMMERCIAL_SKUS.RENEWAL;
}

export const INDIVIDUAL_RENEWAL_MESSAGE = "Kartınız sizin. Yıllık yenilemede yeni kart almanız gerekmez.";


export function formatCommercialTry(amountKurus: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amountKurus / 100);
}

export const COMMERCIAL_COPY = {
  initialPrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus),
  premiumPrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus),
  renewalPrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus),
  additionalCardPrice: formatCommercialTry(COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus),
  replacementCardPrice: formatCommercialTry(COMMERCIAL_PRICING.REPLACEMENT_CARD.priceKurus),
} as const;
