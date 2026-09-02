import { timingSafeEqual } from "node:crypto";

export const IYZICO_WEBHOOK_SECRET_HEADER = "x-yenomi-webhook-secret";

/**
 * Shared-secret gate for the iyzico merchant notification endpoint.
 * iyzico checkout notifications do not ship an HMAC we can verify, so the
 * provider result is still confirmed through retrieveCheckout during settlement.
 * Development may run without the shared secret; production fails closed.
 */
export function webhookSecretHeaderMatches(provided: string | null, expected: string | undefined): boolean {
  const secret = expected?.trim() || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(secret);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
