export type SanitizedProviderPayload = {
  status: unknown;
  paymentStatus: unknown;
  paidPrice: unknown;
  price: unknown;
  currency: unknown;
  basketId: unknown;
  conversationId: unknown;
  paymentId: unknown;
  errorCode: unknown;
  errorMessage: string | null;
};

export function sanitizeProviderPayload(result: unknown): SanitizedProviderPayload | null {
  if (!result || typeof result !== "object") return null;
  const row = result as Record<string, unknown>;
  const errorMessage = typeof row.errorMessage === "string" ? row.errorMessage.slice(0, 180) : null;
  return {
    status: row.status ?? null,
    paymentStatus: row.paymentStatus ?? null,
    paidPrice: row.paidPrice ?? null,
    price: row.price ?? null,
    currency: row.currency ?? null,
    basketId: row.basketId ?? null,
    conversationId: row.conversationId ?? null,
    paymentId: row.paymentId ?? null,
    errorCode: row.errorCode ?? null,
    errorMessage,
  };
}
