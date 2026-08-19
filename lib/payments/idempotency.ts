import { createHash } from "crypto";

export type CheckoutFingerprintInput = {
  items: Array<{
    productSlug: string;
    variantSku?: string;
    quantity: number;
    configuration?: Record<string, unknown>;
  }>;
  email: string;
  totalKurus: number;
  customer?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
  consents?: Record<string, unknown>;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
}

export function normalizeIdempotencyKey(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export function isValidIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9:_-]{16,128}$/.test(value);
}

export function createCheckoutFingerprint(input: CheckoutFingerprintInput): string {
  const items = [...input.items]
    .map((item) => ({
      productSlug: item.productSlug,
      variantSku: item.variantSku ?? null,
      quantity: item.quantity,
      configuration: stableValue(item.configuration ?? {}),
    }))
    .sort((a, b) => `${a.productSlug}:${a.variantSku ?? ""}`.localeCompare(`${b.productSlug}:${b.variantSku ?? ""}`));

  return createHash("sha256")
    .update(JSON.stringify({
      items,
      email: input.email.trim().toLowerCase(),
      totalKurus: input.totalKurus,
      customer: stableValue(input.customer ?? {}),
      shipping: stableValue(input.shipping ?? {}),
      consents: stableValue(input.consents ?? {}),
    }))
    .digest("hex");
}
