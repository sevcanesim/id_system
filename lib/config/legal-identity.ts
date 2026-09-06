export type LegalIdentity = {
  brandName: string;
  productName: string;
  brandLine: string;
  tradeName: string;
  entityType: string;
  taxNumber: string;
  taxOffice: string;
  mersisNumber: string;
  tradeRegistryNumber: string;
  address: string;
  authorizedPerson: string;
  phone: string;
  website: string;
  email: string;
  salesEmail: string;
  kvkkEmail: string;
  paymentProvider: string;
  invoiceProvider: string;
  effectiveDate: string;
};

export const VERIFIED_YENOMI_IDENTITY = {
  brandName: "Yenomilabs",
  productName: "Yenomi ID",
  brandLine: "Yenomi ID — by Yenomilabs",
  tradeName: "Sevcan Eşim Karadeniz",
  entityType: "Şahıs işletmesi",
} as const;

function read(name: string, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

export function getLegalIdentity(): LegalIdentity {
  return {
    brandName: VERIFIED_YENOMI_IDENTITY.brandName,
    productName: VERIFIED_YENOMI_IDENTITY.productName,
    brandLine: VERIFIED_YENOMI_IDENTITY.brandLine,
    tradeName: VERIFIED_YENOMI_IDENTITY.tradeName,
    entityType: VERIFIED_YENOMI_IDENTITY.entityType,
    // These identifiers remain blank until verified. They must never inherit
    // the identifier of a different legal entity.
    taxNumber: read("LEGAL_TAX_NUMBER"),
    taxOffice: read("LEGAL_TAX_OFFICE", "Hasan Tahsin Vergi Dairesi"),
    mersisNumber: read("LEGAL_MERSIS_NUMBER"),
    tradeRegistryNumber: read("LEGAL_TRADE_REGISTRY_NUMBER"),
    address: read("LEGAL_REGISTERED_ADDRESS", "Kazım Dirik Mah. 296/2 Sk. No: 33, Bornova / İzmir 35100"),
    authorizedPerson: read("LEGAL_AUTHORIZED_PERSON", "Sevcan Eşim Karadeniz"),
    phone: read("LEGAL_PHONE", "+90 506 957 36 72"),
    // This value is deployment-owned. Do not fall back to another brand's URL.
    website: read("LEGAL_WEBSITE"),
    email: read("LEGAL_CONTACT_EMAIL", "hello@yenomilabs.com"),
    salesEmail: read("LEGAL_SALES_EMAIL", read("LEGAL_CONTACT_EMAIL", "hello@yenomilabs.com")),
    kvkkEmail: read("LEGAL_KVKK_EMAIL", read("LEGAL_CONTACT_EMAIL", "hello@yenomilabs.com")),
    paymentProvider: read("LEGAL_PAYMENT_PROVIDER", "PayTR"),
    invoiceProvider: read("LEGAL_INVOICE_PROVIDER", "Mysoft"),
    effectiveDate: read("LEGAL_EFFECTIVE_DATE", "2026-08-13"),
  };
}
