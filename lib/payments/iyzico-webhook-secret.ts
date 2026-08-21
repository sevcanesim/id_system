import { timingSafeEqual } from "node:crypto";

export const IYZICO_WEBHOOK_SECRET_HEADER = "x-yenomi-webhook-secret";

/**
 * Optional shared-secret gate. iyzico checkout notifications do not ship an
 * HMAC we can verify; authenticity still comes from retrieveCheckout.
 * When IYZICO_WEBHOOK_SECRET is unset, production webhooks keep working.
 */
export function webhookSecretHeaderMatches(provided: string | null, expected: string | undefined): boolean {
  const secret = expected?.trim() || "";
  if (!secret) return true;
  if (!provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(secret);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
