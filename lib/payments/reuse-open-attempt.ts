export type OpenPaymentAttempt = {
  status: string;
  request_fingerprint: string | null;
  payment_page_url: string | null;
};

export type OpenAttemptDecision = "none" | "reuse" | "conflict";

/**
 * One AWAITING_PAYMENT order may have only one live iyzico session.
 * A second initialize on a still-PENDING attempt is how double-charge happens.
 *
 * A PENDING attempt without a payment_page_url is treated as in-flight rather
 * than abandoned. Another HTTP request must not mark it FAILED while the first
 * request may still be waiting for Iyzico to return a token/payment page.
 */
export function decideOpenPaymentAttempt(
  attempt: OpenPaymentAttempt | null | undefined,
  fingerprint: string,
): OpenAttemptDecision {
  if (!attempt || attempt.status !== "PENDING") return "none";
  if (attempt.request_fingerprint && attempt.request_fingerprint !== fingerprint) return "conflict";
  if (attempt.payment_page_url) return "reuse";
  return "conflict";
}
