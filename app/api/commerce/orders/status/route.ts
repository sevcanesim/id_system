import { NextRequest, NextResponse } from "next/server";
import { loadCommerceOrderKind } from "../../../../../lib/commerce/order-kind";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../../lib/observability/system-errors";
import { resolvePaytrResultReference } from "../../../../../lib/payments/paytr-presentation";

export const runtime = "nodejs";

const PAID_STATUSES = new Set(["PAID", "PREPARING", "SHIPPED", "COMPLETED"]);

export async function GET(request: NextRequest) {
  const paymentResult = request.nextUrl.searchParams.get("result") || "";
  const resolvedReference = resolvePaytrResultReference(paymentResult);
  if (!resolvedReference) {
    return NextResponse.json({ found: false, paid: false, status: null }, { status: 400 });
  }
  const orderId = resolvedReference.orderId;

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
