import { NextRequest, NextResponse } from "next/server";
import { loadCommerceOrderKind } from "../../../../../lib/commerce/order-kind";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../../lib/observability/system-errors";

export const runtime = "nodejs";

// Order statuses that mean "payment succeeded" from the shopper's point of
// view. Anything else (DRAFT, AWAITING_PAYMENT, CANCELLED, REFUNDED, or an
// unknown/missing order) must never render as a success state.
const PAID_STATUSES = new Set(["PAID", "PREPARING", "SHIPPED", "COMPLETED"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public, unauthenticated order-status check used by the /odeme/basarili and
 * /odeme/basarisiz result pages so they can verify a payment before showing
 * success content. Deliberately returns only a coarse status enum plus
 * boolean flags (activationRequired, corporate, corporateReady, reviewRequired) and the
 * non-sensitive payment provider — never
 * email, amount, items, company name, user id, or any other order detail —
 * so it stays safe to call without auth for a guest checkout flow. The order
 * id itself is already a public, unguessable UUID that the payment callback
 * puts in the redirect URL, so exposing this minimal status by id does not
 * leak anything new.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order") || "";
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ found: false, paid: false, status: null }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("commerce_orders")
      .select("status,user_id,activation_claimed_at")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      void recordSystemError({
        source: "COMMERCE_ORDER_STATUS",
        errorCode: "ORDER_LOOKUP_FAILED",
        message: "Ödeme sonucu sipariş durumu yüklenemedi.",
      });
      return NextResponse.json({ found: false, paid: false, status: null }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ found: false, paid: false, status: null }, { status: 404 });
    }

    const { data: paymentAttempt } = await admin
      .from("commerce_payment_attempts")
      .select("provider")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paid = PAID_STATUSES.has(String(data.status));
    const flags = paid
      ? await loadCommerceOrderKind(admin, orderId)
      : { corporate: false, corporateReady: false, seatPack: false, seatPackFulfillment: null, reviewRequired: false };

    return NextResponse.json({
      found: true,
      paid,
      status: data.status,
      paymentProvider: paymentAttempt?.provider === "PAYTR" ? "PAYTR" : null,
      activationRequired: paid && !data.user_id && !data.activation_claimed_at,
      corporate: flags.corporate,
      corporateReady: Boolean(flags.corporateReady),
      seatPack: Boolean(flags.seatPack),
      seatPackFulfillment: flags.seatPackFulfillment ?? null,
      reviewRequired: flags.reviewRequired,
    });
  } catch {
    void recordSystemError({
      source: "COMMERCE_ORDER_STATUS",
      errorCode: "STATUS_REQUEST_FAILED",
      message: "Ödeme sonucu sipariş durumu doğrulanamadı.",
    });
    return NextResponse.json({ found: false, paid: false, status: null }, { status: 500 });
  }
}
