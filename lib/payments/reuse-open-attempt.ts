export type OpenPaymentAttempt = {
  status: string;
  request_fingerprint: string | null;
  payment_token_ciphertext: string | null;
  payment_token_expires_at?: string | null;
  updated_at?: string | null;
};

export type OpenAttemptDecision = "none" | "reuse" | "conflict" | "abandon";

/**
 * One AWAITING_PAYMENT order may have only one live PayTR session. A pending
 * row without its encrypted hosted-page token is an initialization lease, not a payment
 * session: it may be retried only after the lease expires.
 */
export function decideOpenPaymentAttempt(
  attempt: OpenPaymentAttempt | null | undefined,
  fingerprint: string,
  now = Date.now(),
  initializationLeaseMs = 120_000,
): OpenAttemptDecision {
  if (!attempt || attempt.status !== "PENDING") return "none";
  if (attempt.request_fingerprint && attempt.request_fingerprint !== fingerprint) return "conflict";
  const tokenExpiresAt = attempt.payment_token_expires_at ? new Date(attempt.payment_token_expires_at).getTime() : NaN;
  if (attempt.payment_token_ciphertext && Number.isFinite(tokenExpiresAt) && tokenExpiresAt > now) return "reuse";
  const updatedAt = attempt.updated_at ? new Date(attempt.updated_at).getTime() : NaN;
  if (Number.isFinite(updatedAt) && now - updatedAt >= initializationLeaseMs) return "abandon";
  return "conflict";
}
