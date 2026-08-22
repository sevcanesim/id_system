import type { getSupabaseAdminClient } from "../supabase/server-admin";

export async function findExistingCheckoutAttempt(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  idempotencyKey: string,
) {
  return admin
    .from("commerce_payment_attempts")
    .select("id,order_id,status,request_fingerprint,payment_page_url")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
}
