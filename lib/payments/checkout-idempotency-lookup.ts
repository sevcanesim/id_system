import type { getSupabaseAdminClient } from "../supabase/server-admin";

export async function findExistingCheckoutAttempt(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  idempotencyKey: string,
) {
  return admin
    .from("commerce_payment_attempts")
    .select("id,order_id,status,request_fingerprint,payment_token_ciphertext,payment_token_expires_at,updated_at")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
}
