import { COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "./commercial";

export type ProductKind = "DIGITAL" | "PHYSICAL";
export type ProductCategory = "DIGITAL_ID" | "NFC" | "HEALTH_ID";
export type ProductStatus = "AVAILABLE" | "COMING_SOON";

export type ProductVariant = {
  id: string;
  name: string;
  color?: "BLACK" | "WHITE" | "PURPLE";
  priceDeltaKurus: number;
  active: boolean;
};

export type CatalogProduct = {
  slug: string;
  sku: string;
  defaultOfferSku?: string;
  name: string;
  shortDescription: string;
  kind: ProductKind;
  category: ProductCategory;
  status: ProductStatus;
  currency: "TRY";
  unitPriceKurus: number;
  shippingPriceKurus: number;
  active: boolean;
  variants: readonly ProductVariant[];
};

export const PRODUCT_CATALOG = [
  {
    slug: "dijital-kartvizit",
    sku: "YENOMI-DIGITAL-ID",
    name: "Yenomi ID Dijital Kartvizit",
    shortDescription: "QR bağlantılı, güncellenebilir profesyonel profil.",
    kind: "DIGITAL",
    category: "DIGITAL_ID",
    status: "COMING_SOON",
    currency: "TRY",
    unitPriceKurus: 0,
    shippingPriceKurus: 0,
    active: false,
    variants: [],
  },
  {
    slug: "nfc-kart",
    sku: "YENOMI-NFC-CARD",
    defaultOfferSku: COMMERCIAL_PRICING.YENOMI_ID_INITIAL.sku,
    name: "Yenomi ID NFC Kart",
    shortDescription: "Kişisel QR ve NFC özellikli premium fiziksel kart.",
    kind: "PHYSICAL",
    category: "NFC",
    status: "AVAILABLE",
    currency: "TRY",
    unitPriceKurus: COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus,
    shippingPriceKurus: 0,
    active: true,
    variants: [
      { id: "black", name: "Siyah", color: "BLACK", priceDeltaKurus: 0, active: true },
      { id: "white", name: "Beyaz", color: "WHITE", priceDeltaKurus: 0, active: true },
      { id: "purple", name: "Yenomi Mor", color: "PURPLE", priceDeltaKurus: 0, active: true },
    ],
  },
  {
    slug: "dijital-saglik-karti",
    sku: "YENOMI-HEALTH-ID",
    name: "Yenomi ID Dijital Sağlık Kartı",
    shortDescription: "Acil durum bilgilerin, kan grubun ve kritik sağlık notların tek QR'da.",
    kind: "DIGITAL",
    category: "HEALTH_ID",
    status: "COMING_SOON",
    currency: "TRY",
    unitPriceKurus: 0,
    shippingPriceKurus: 0,
    active: false,
    variants: [],
  },
  {
    slug: "dijital-kimlik-cuzdani",
    sku: "YENOMI-ID-WALLET",
    name: "Yenomi ID Kimlik Cüzdanı",
    shortDescription: "Hayatının tüm dijital kimliklerini (kartvizit, sağlık, üyelikler) tek profilde topla.",
    kind: "DIGITAL",
    category: "DIGITAL_ID",
    status: "COMING_SOON",
    currency: "TRY",
    unitPriceKurus: 0,
    shippingPriceKurus: 0,
    active: false,
    variants: [],
  },
] as const satisfies readonly CatalogProduct[];

/** Catalog slices for roadmap surfaces. Live purchase paths use NFC_PRODUCT. */
export const AVAILABLE_PRODUCTS = PRODUCT_CATALOG.filter((product) => product.status === "AVAILABLE");
export const COMING_SOON_PRODUCTS = PRODUCT_CATALOG.filter((product) => product.status === "COMING_SOON");

export const NFC_PRODUCT = PRODUCT_CATALOG[1];

export type CatalogOfferVariant = {
  sku: string;
  priceKurus: number;
  metadata?: Record<string, unknown> | null;
};

const NON_LISTING_OFFER_SKUS = new Set<string>([
  COMMERCIAL_SKUS.ADDITIONAL_CARD,
  COMMERCIAL_SKUS.REPLACEMENT_CARD,
  COMMERCIAL_SKUS.RENEWAL,
]);

/**
 * Public listing and product-detail must show the same initial bundle price.
 * Database variant order is not guaranteed; extra/renewal SKUs must never win.
 */
export function selectInitialOfferVariant<T extends CatalogOfferVariant>(
  variants: readonly T[] | undefined,
): T | undefined {
  if (!variants?.length) return undefined;
  const bySku = variants.find((item) => item.sku === COMMERCIAL_SKUS.INITIAL);
  if (bySku) return bySku;
  const byKind = variants.find(
    (item) => item.metadata?.fulfillment_kind === "INITIAL_BUNDLE" && !NON_LISTING_OFFER_SKUS.has(item.sku),
  );
  if (byKind) return byKind;
  return undefined;
}

export function listingPriceKurus(
  variants: readonly CatalogOfferVariant[] | undefined,
  fallbackKurus = NFC_PRODUCT.unitPriceKurus,
): number {
  return selectInitialOfferVariant(variants)?.priceKurus ?? fallbackKurus;
}

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return PRODUCT_CATALOG.find((product) => product.slug === slug);
}

export function formatTryFromKurus(amountKurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountKurus / 100);
}

export function calculateProductTotalKurus(product: CatalogProduct, quantity: number, variantId?: string): number {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.min(20, Math.trunc(quantity))) : 1;
  const variant = variantId ? product.variants.find((item) => item.id === variantId && item.active) : undefined;
  const unitPrice = product.unitPriceKurus + (variant?.priceDeltaKurus ?? 0);
  return unitPrice * safeQuantity + product.shippingPriceKurus;
}

export function getNfcOrderTotalKurus(quantity: number): number {
  return calculateProductTotalKurus(NFC_PRODUCT, quantity);
}

export const EXTRA_NFC_CARD_PRICE_KURUS = COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus;
export const REPLACEMENT_NFC_CARD_PRICE_KURUS = COMMERCIAL_PRICING.REPLACEMENT_CARD.priceKurus;
export const BUSINESS_SEAT_PACKS = COMMERCIAL_PRICING.BUSINESS_SEAT_PACKS;
export const SERVICE_TERM_DAYS = COMMERCIAL_PRICING.SERVICE.termDays;
