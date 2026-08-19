export type LegalIdentity = {
  tradeName: string;
  taxNumber: string;
  taxOffice: string;
  mersisNumber: string;
  address: string;
  authorizedPerson: string;
  phone: string;
  website: string;
  email: string;
  kvkkEmail: string;
  effectiveDate: string;
};

function read(name: string, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

export function getLegalIdentity(): LegalIdentity {
  return {
    tradeName: read("LEGAL_TRADE_NAME", "OPSOLA Mühendislik Endüstriyel Çözümler ve Yazılım Sanayi Ticaret Limited Şirketi"),
    taxNumber: read("LEGAL_TAX_NUMBER", "6440962576"),
    taxOffice: read("LEGAL_TAX_OFFICE", "Hasan Tahsin Vergi Dairesi"),
    mersisNumber: read("LEGAL_MERSIS_NUMBER", "0644096257600001"),
    address: read("LEGAL_REGISTERED_ADDRESS", "Kazımdirik Mah. 296/2 Sk. No: 33, Bornova / İzmir, 35100"),
    authorizedPerson: read("LEGAL_AUTHORIZED_PERSON", "Şirket Yetkilisi"),
    phone: read("LEGAL_PHONE", "+90 555 834 2672"),
    website: read("LEGAL_WEBSITE", "www.opsola.com"),
    email: read("LEGAL_CONTACT_EMAIL", "hello@yenomilabs.com"),
    kvkkEmail: read("LEGAL_KVKK_EMAIL", read("LEGAL_CONTACT_EMAIL", "hello@yenomilabs.com")),
    effectiveDate: read("LEGAL_EFFECTIVE_DATE", "2026-08-13"),
  };
}
