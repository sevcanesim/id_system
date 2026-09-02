import type { getSupabaseAdminClient } from "../supabase/server-admin";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

type ReservationDecision = "RESERVED" | "REUSE" | "IN_PROGRESS" | "EXISTING";

export type CheckoutAttemptReservation = {
  ok: boolean;
  code?: string;
  decision?: ReservationDecision;
  attempt_id?: string;
  order_id?: string;
  status?: string;
  request_fingerprint?: string | null;
  payment_page_url?: string | null;
};

export async function reserveCheckoutAttempt(
  admin: AdminClient,
  input: {
    orderId: string;
    amountKurus: number;
    conversationId: string;
    fingerprint: string;
    idempotencyKey: string;
  },
): Promise<{ data: CheckoutAttemptReservation | null; error: string | null }> {
  const { data, error } = await admin.rpc("reserve_commerce_payment_attempt", {
    p_order_id: input.orderId,
    p_amount_kurus: input.amountKurus,
    p_currency: "TRY",
    p_conversation_id: input.conversationId,
    p_request_fingerprint: input.fingerprint,
    p_idempotency_key: input.idempotencyKey,
  });

  return {
    data: (data as CheckoutAttemptReservation | null) ?? null,
    error: error?.message ?? null,
  };
}
