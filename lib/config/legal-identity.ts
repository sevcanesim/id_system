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

function read(name: string, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

export function getLegalIdentity(): LegalIdentity {
  return {
    brandName: read("BRAND_NAME", "Yenomilabs"),
    productName: read("PRODUCT_NAME", "Yenomi ID"),
    brandLine: read("BRAND_LINE", "Yenomi ID — by Yenomilabs"),
    tradeName: read("LEGAL_TRADE_NAME", "Sevcan Eşim Karadeniz"),
    entityType: read("LEGAL_ENTITY_TYPE", "Şahıs işletmesi"),
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
