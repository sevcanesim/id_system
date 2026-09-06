export type SanitizedProviderPayload = {
  provider: unknown;
  status: unknown;
  paymentStatus: unknown;
  paidPrice: unknown;
  price: unknown;
  currency: unknown;
  errorCode: unknown;
};

function safeProviderCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_:-]/g, "_").slice(0, 120);
  return normalized || null;
}

export function sanitizeProviderPayload(result: unknown): SanitizedProviderPayload | null {
  if (!result || typeof result !== "object") return null;
  const row = result as Record<string, unknown>;
  return {
    provider: row.provider ?? null,
    status: row.status ?? null,
    paymentStatus: row.paymentStatus ?? null,
    paidPrice: row.paidPrice ?? null,
    price: row.price ?? null,
    currency: row.currency ?? null,
    errorCode: safeProviderCode(row.errorCode),
  };
}
