export type CompanyBilling = {
  name: string;
  taxNumber: string;
  taxOffice: string;
};

export function normalizeTaxNumber(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeCompanyName(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeTaxOffice(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

/** 10-digit VKN checksum used by Turkish tax offices. */
export function isValidTurkishTaxNumber(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const digits = value.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    const tmp = (digits[i] + 9 - i) % 10;
    let ck = (tmp * (2 ** (9 - i))) % 9;
    if (tmp !== 0 && ck === 0) ck = 9;
    if (tmp === 0) ck = 0;
    sum += ck;
  }
  return ((10 - (sum % 10)) % 10) === digits[9];
}

export function isValidCompanyTaxNumber(value: string): boolean {
  return value.length === 10 && isValidTurkishTaxNumber(value);
}

export function parseCompanyBilling(input: unknown): { ok: true; company: CompanyBilling } | { ok: false; error: string } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const name = normalizeCompanyName(raw.name);
  const taxNumber = normalizeTaxNumber(raw.taxNumber);
  const taxOffice = normalizeTaxOffice(raw.taxOffice);
  if (name.length < 2 || name.length > 180) {
    return { ok: false, error: "Şirket unvanını gir." };
  }
  if (!isValidCompanyTaxNumber(taxNumber)) {
    return { ok: false, error: "Kurumsal paket için resmî 10 haneli VKN gir." };
  }
  if (taxOffice.length < 2 || taxOffice.length > 80) {
    return { ok: false, error: "Vergi dairesini gir." };
  }
  return { ok: true, company: { name, taxNumber, taxOffice } };
}
