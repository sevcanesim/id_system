import { getSupabaseAdminClient } from "../supabase/server-admin";

const MIN_PENDING_AGE_MS = 2 * 60 * 1000;
const MAX_BATCH = 100;

/**
 * PayTR is settled only by its signed callback. This job never attempts to
 * infer a payment result; it releases initialization leases for attempts
 * whose encrypted hosted payment token was never persisted after a process failure.
 */
export async function reconcileAwaitingProviderPayments(now = Date.now()) {
  const admin = getSupabaseAdminClient();
  const cutoff = new Date(now - MIN_PENDING_AGE_MS).toISOString();

  const { data: attempts, error } = await admin
    .from("commerce_payment_attempts")
    .select("id,order_id")
    .eq("status", "PENDING")
    .eq("provider", "PAYTR")
    .is("payment_token_ciphertext", null)
    .lte("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(MAX_BATCH);

  if (error) throw error;
  if (!attempts?.length) return { scanned: 0, released: 0, errors: 0 };

  const ids = attempts.map((attempt) => attempt.id);
  const { data: releasedRows, error: releaseError } = await admin
    .from("commerce_payment_attempts")
    .update({
      status: "FAILED",
      idempotency_key: null,
      error_code: "PAYTR_INITIALIZATION_EXPIRED",
      error_message: "Hosted ödeme oturumu oluşturulamadı; yeni deneme güvenle başlatılabilir.",
      updated_at: new Date(now).toISOString(),
    })
    .in("id", ids)
    .eq("status", "PENDING")
    .is("payment_token_ciphertext", null)
    .select("id");
  if (releaseError) throw releaseError;

  return { scanned: ids.length, released: releasedRows?.length ?? 0, errors: 0 };
}
