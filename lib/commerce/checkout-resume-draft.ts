import { createCartItemId, type CartItem, type ProductKind } from "../cart";

const PRODUCT_KINDS = new Set<ProductKind>(["BUSINESS_CARD", "HEALTH_CARD", "NFC_PHYSICAL_CARD"]);
const SAFE_FORM_FIELDS = [
  "recipientName",
  "email",
  "phone",
  "addressLine",
  "district",
  "city",
  "postalCode",
  "deliveryNote",
  "companyName",
  "companyTaxNumber",
  "companyTaxOffice",
] as const;

type SafeFormField = (typeof SAFE_FORM_FIELDS)[number];

export type CheckoutResumeDraft = {
  items: CartItem[];
  form: Partial<Record<SafeFormField, string>> & {
    latitude?: number;
    longitude?: number;
  };
};

function safeConfiguration(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const serialized = JSON.stringify(value);
  if (serialized.length > 20_000) return undefined;
  return value as Record<string, unknown>;
}

function parseItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const productId = typeof row.productId === "string" ? row.productId.trim() : "";
  const variantSku = typeof row.variantSku === "string" ? row.variantSku.trim() : "";
  const kind = typeof row.kind === "string" ? row.kind as ProductKind : null;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const unitPriceKurus = Number(row.unitPriceKurus);
  const quantity = Number(row.quantity);
  if (
    !productId || productId.length > 100 || !variantSku || variantSku.length > 100 ||
    !kind || !PRODUCT_KINDS.has(kind) || !name || name.length > 180 ||
    !Number.isInteger(unitPriceKurus) || unitPriceKurus < 0 ||
    !Number.isInteger(quantity) || quantity < 1 || quantity > 20
  ) return null;

  return {
    cartItemId: createCartItemId(),
    productId,
    variantSku,
    kind,
    name,
    unitPriceKurus,
    quantity,
    configuration: safeConfiguration(row.configuration),
  };
}

function safeText(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

export function parseCheckoutResumeDraft(value: unknown): CheckoutResumeDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const draft = value as Record<string, unknown>;
  if (!Array.isArray(draft.items) || draft.items.length === 0 || draft.items.length > 20) return null;
  const items = draft.items.map(parseItem);
  if (items.some((item) => !item)) return null;

  const rawForm = draft.form && typeof draft.form === "object" && !Array.isArray(draft.form)
    ? draft.form as Record<string, unknown>
    : {};
  const form: CheckoutResumeDraft["form"] = {};
  for (const field of SAFE_FORM_FIELDS) {
    const value = safeText(rawForm[field], field === "addressLine" || field === "deliveryNote" ? 500 : 180);
    if (value !== undefined) form[field] = value;
  }
  if (typeof rawForm.latitude === "number" && rawForm.latitude >= -90 && rawForm.latitude <= 90) {
    form.latitude = rawForm.latitude;
  }
  if (typeof rawForm.longitude === "number" && rawForm.longitude >= -180 && rawForm.longitude <= 180) {
    form.longitude = rawForm.longitude;
  }

  return { items: items as CartItem[], form };
}
