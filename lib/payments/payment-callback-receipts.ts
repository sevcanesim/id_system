import { createHash } from "crypto";
import { getSupabaseAdminClient } from "../supabase/server-admin";

function providerReferenceHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function recordPaytrCallbackReceived(input: { merchantOid: string; amountKurus: number }) {
  const admin = getSupabaseAdminClient();
  const providerReferenceHashValue = providerReferenceHash(input.merchantOid);
  const { error } = await admin
    .from("payment_callback_receipts")
    .insert({
      provider: "PAYTR",
      provider_reference_hash: providerReferenceHashValue,
      amount_kurus: input.amountKurus,
      status: "RECEIVED",
    });

  // Duplicate callbacks are expected. The first durable receipt is enough;
  // the callback's atomic payment settlement remains idempotent.
  if (error && error.code !== "23505") throw error;
  return providerReferenceHashValue;
}

export async function finalizePaytrCallbackReceipt(input: {
  providerReferenceHash: string;
  status: "PROCESSED" | "RETRYING";
  attemptId?: string | null;
  orderId?: string | null;
  errorCode?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("payment_callback_receipts")
    .update({
      status: input.status,
      attempt_id: input.attemptId ?? null,
      order_id: input.orderId ?? null,
      error_code: input.errorCode ?? null,
      processed_at: input.status === "PROCESSED" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "PAYTR")
    .eq("provider_reference_hash", input.providerReferenceHash);
  if (error) throw error;
}
