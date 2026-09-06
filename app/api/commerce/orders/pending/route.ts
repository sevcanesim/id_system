import { NextRequest, NextResponse } from "next/server";
import { applyPendingOrderCookie, readPendingOrderId } from "../../../../../lib/payments/pending-order-cookie";
import { createPaytrResultReference } from "../../../../../lib/payments/paytr-presentation";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../../lib/observability/system-errors";

export const runtime = "nodejs";

const PAID_STATUSES = new Set(["PAID", "PREPARING", "SHIPPED", "COMPLETED"]);

export async function GET(request: NextRequest) {
  const orderId = readPendingOrderId(request);
  if (!orderId) return NextResponse.json({ found: false, orderId: null, paid: false, awaitingPayment: false, paymentResultUrl: null });

  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin.from("commerce_orders").select("id,status").eq("id", orderId).maybeSingle();
    if (!data) {
      const response = NextResponse.json({ found: false, orderId: null, paid: false, awaitingPayment: false, paymentResultUrl: null });
      return applyPendingOrderCookie(response, null);
    }
    const paid = PAID_STATUSES.has(String(data.status));
    const awaitingPayment = data.status === "AWAITING_PAYMENT";
    const paymentResultUrl = paid
      ? `/odeme/basarili?result=${encodeURIComponent(createPaytrResultReference(data.id))}`
      : null;
    const response = NextResponse.json({
      found: true,
      orderId: awaitingPayment ? data.id : null,
      paid,
      awaitingPayment,
      paymentResultUrl,
      status: data.status,
    });
    if (!paid && !awaitingPayment) return applyPendingOrderCookie(response, null);
    return response;
  } catch {
    void recordSystemError({
      source: "COMMERCE_PENDING_ORDER",
      errorCode: "LOOKUP_FAILED",
      message: "Bekleyen sipariş bilgisi yüklenemedi.",
    });
    return NextResponse.json({ found: false, orderId: null, paid: false, awaitingPayment: false, paymentResultUrl: null }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return applyPendingOrderCookie(response, null);
}
