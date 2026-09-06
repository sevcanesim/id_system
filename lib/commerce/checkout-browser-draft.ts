import type { CartItem } from "../cart";

const STORAGE_KEY = "yenomi_checkout_browser_draft_v1";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type CheckoutBrowserForm = {
  recipientName: string;
  email: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode: string;
  deliveryNote: string;
  companyEntityType: string;
  companyName: string;
  companyTaxOffice: string;
};

type StoredDraft = {
  expiresAt: number;
  cartSignature: string;
  form: CheckoutBrowserForm;
  deliveryNoteOpen: boolean;
};

function validText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

function parseStoredDraft(value: unknown, cartSignature: string): StoredDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.cartSignature !== cartSignature || typeof candidate.expiresAt !== "number" || candidate.expiresAt <= Date.now()) return null;
  if (!candidate.form || typeof candidate.form !== "object" || Array.isArray(candidate.form)) return null;
  const form = candidate.form as Record<string, unknown>;
  const recipientName = validText(form.recipientName, 180);
  const email = validText(form.email, 254);
  const phone = validText(form.phone, 32);
  const addressLine = validText(form.addressLine, 500);
  const district = validText(form.district, 180);
  const city = validText(form.city, 180);
  const postalCode = validText(form.postalCode, 24);
  const deliveryNote = validText(form.deliveryNote, 500);
  const companyEntityType = validText(form.companyEntityType, 48);
  const companyName = validText(form.companyName, 240);
  const companyTaxOffice = validText(form.companyTaxOffice, 180);
  if (
    recipientName === null || email === null || phone === null || addressLine === null || district === null ||
    city === null || postalCode === null || deliveryNote === null || companyEntityType === null ||
    companyName === null || companyTaxOffice === null
  ) return null;

  return {
    expiresAt: candidate.expiresAt,
    cartSignature,
    form: { recipientName, email, phone, addressLine, district, city, postalCode, deliveryNote, companyEntityType, companyName, companyTaxOffice },
    deliveryNoteOpen: candidate.deliveryNoteOpen === true,
  };
}

export function checkoutCartSignature(items: readonly CartItem[]) {
  return JSON.stringify(items.map((item) => ({
    productId: item.productId,
    variantSku: item.variantSku,
    quantity: item.quantity,
    organizationId: typeof item.configuration?.organizationId === "string" ? item.configuration.organizationId : null,
  })));
}

export function readCheckoutBrowserDraft(cartSignature: string): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const draft = raw ? parseStoredDraft(JSON.parse(raw), cartSignature) : null;
    if (!draft) window.localStorage.removeItem(STORAGE_KEY);
    return draft;
  } catch {
    return null;
  }
}

export function writeCheckoutBrowserDraft(input: {
  cartSignature: string;
  form: CheckoutBrowserForm;
  deliveryNoteOpen: boolean;
}) {
  if (typeof window === "undefined") return;
  const payload: StoredDraft = {
    expiresAt: Date.now() + DRAFT_TTL_MS,
    cartSignature: input.cartSignature,
    form: input.form,
    deliveryNoteOpen: input.deliveryNoteOpen,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

export function clearCheckoutBrowserDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
