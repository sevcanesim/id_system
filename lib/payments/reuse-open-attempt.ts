export type OpenPaymentAttempt = {
  status: string;
  request_fingerprint: string | null;
  payment_page_url: string | null;
};

export type OpenAttemptDecision = "none" | "reuse" | "conflict" | "abandon";

/**
 * One AWAITING_PAYMENT order may have only one live iyzico session.
 * A second initialize on a still-PENDING attempt is how double-charge happens.
 */
export function decideOpenPaymentAttempt(
  attempt: OpenPaymentAttempt | null | undefined,
  fingerprint: string,
): OpenAttemptDecision {
  if (!attempt || attempt.status !== "PENDING") return "none";
  if (attempt.request_fingerprint && attempt.request_fingerprint !== fingerprint) return "conflict";
  if (attempt.payment_page_url) return "reuse";
  return "abandon";
}
