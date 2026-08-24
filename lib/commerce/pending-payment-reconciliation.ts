import { settlePendingCommercePaymentByOrderId } from "../payments/settle-commerce-payment";
import { getSupabaseAdminClient } from "../supabase/server-admin";

const MIN_PENDING_AGE_MS = 15 * 60 * 1000;
const MAX_BATCH = 100;

export async function reconcileAwaitingProviderPayments(now = Date.now()) {
  const admin = getSupabaseAdminClient();
  const cutoff = new Date(now - MIN_PENDING_AGE_MS).toISOString();

  const { data: attempts, error } = await admin
    .from("commerce_payment_attempts")
    .select("order_id,updated_at,commerce_orders!inner(status)")
    .eq("status", "PENDING")
    .not("provider_token", "is", null)
    .eq("commerce_orders.status", "AWAITING_PAYMENT")
    .lte("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(MAX_BATCH);

  if (error) throw error;
  if (!attempts?.length) return { scanned: 0, paid: 0, pending: 0, failed: 0, errors: 0 };

  let paid = 0;
  let pending = 0;
  let failed = 0;
  let errors = 0;
  const seen = new Set<string>();

  for (const attempt of attempts) {
    if (seen.has(attempt.order_id)) continue;
    seen.add(attempt.order_id);
    try {
      const result = await settlePendingCommercePaymentByOrderId(attempt.order_id);
      if (result.kind === "paid") paid += 1;
      else if (result.kind === "pending") pending += 1;
      else if (result.kind === "failed") failed += 1;
      else errors += 1;
    } catch (error) {
      errors += 1;
      console.error("pending payment reconciliation failed", {
        orderId: attempt.order_id,
        message: error instanceof Error ? error.message : "UNKNOWN",
      });
    }
  }

  return { scanned: seen.size, paid, pending, failed, errors };
}
