export const COMMERCIAL_PRICING = {
  YENOMI_ID_INITIAL: { sku: "YENOMI-NFC-CARD-ANNUAL", priceKurus: 79_900, billing: "ONE_TIME_WITH_INCLUDED_TERM" },
  YENOMI_ID_RENEWAL: { sku: "YENOMI-DIGITAL-RENEWAL-ANNUAL", priceKurus: 29_900, billing: "YEARLY_RENEWAL" },
  ADDITIONAL_CARD: { sku: "YENOMI-NFC-EXTRA", priceKurus: 39_900, billing: "ONE_TIME" },
  REPLACEMENT_CARD: { sku: "YENOMI-NFC-REPLACEMENT", priceKurus: 34_900, billing: "ONE_TIME" },
  BUSINESS_STARTER: { code: "STARTER", seats: 10, priceKurus: 799_000 },
  BUSINESS_GROWTH: { code: "GROWTH", seats: 25, priceKurus: 1_799_000 },
  BUSINESS: { code: "BUSINESS", seats: 50, priceKurus: 3_199_000 },
  ENTERPRISE: { code: "ENTERPRISE", seats: null, priceKurus: null },
  BUSINESS_SEAT_PACKS: [
    { seats: 1, sku: "YENOMI-BUSINESS-SEATS-1", name: "Ek 1 Kullanıcı + Kart", priceKurus: 84_900 },
    { seats: 2, sku: "YENOMI-BUSINESS-SEATS-2", name: "Ek 2 Kullanıcı + Kart", priceKurus: 159_000 },
    { seats: 3, sku: "YENOMI-BUSINESS-SEATS-3", name: "Ek 3 Kullanıcı + Kart", priceKurus: 229_000 },
    { seats: 5, sku: "YENOMI-BUSINESS-SEATS-5", name: "Ek 5 Kullanıcı + Kart", priceKurus: 359_000 },
    { seats: 10, sku: "YENOMI-BUSINESS-SEATS-10", name: "Ek 10 Kullanıcı + Kart", priceKurus: 649_000 },
  ],
  DOMESTIC_SHIPPING: { priceKurus: 0, country: "TR", includedForPhysicalProducts: true },
  SERVICE: { termDays: 365, graceDays: 7, activationLinkDays: 7, activationResendLinkHours: 24, activationMaxDelayDays: 30 },
} as const;

export const COMMERCIAL_SKUS = {
  INITIAL: COMMERCIAL_PRICING.YENOMI_ID_INITIAL.sku,
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
  renewalPrice: formatCommercialTry(COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus),
  additionalCardPrice: formatCommercialTry(COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus),
  replacementCardPrice: formatCommercialTry(COMMERCIAL_PRICING.REPLACEMENT_CARD.priceKurus),
} as const;
