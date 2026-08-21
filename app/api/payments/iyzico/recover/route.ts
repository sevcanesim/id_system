import { NextRequest, NextResponse } from "next/server";
import { resolveRequestUserId } from "../../../../../lib/auth/http-only-session";
import { ownerMayRecover, resolveRecoverIntent } from "../../../../../lib/payments/recover-authorization";
import { readPendingOrderId } from "../../../../../lib/payments/pending-order-cookie";
import { settlePendingCommercePaymentByOrderId } from "../../../../../lib/payments/settle-commerce-payment";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

/**
 * Public recover for a charged iyzico checkout whose callback POST never
 * arrived. The HttpOnly pending-order cookie is possession proof when present.
 * A body order UUID without that cookie is settled only for the authenticated
 * owner. Body UUID alone is not authorization. GET order-status stays
 * side-effect free.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bodyOrderId = String((body as { orderId?: unknown }).orderId || "");
    const intent = resolveRecoverIntent(readPendingOrderId(request), bodyOrderId || null);
    if (intent.kind === "mismatch") {
      return NextResponse.json({ found: false, paid: false }, { status: 409 });
    }
    if (intent.kind === "missing") {
      return NextResponse.json({ found: false, paid: false }, { status: 400 });
    }

    const orderId = intent.orderId;
    if (intent.kind === "owner-required") {
      const userId = await resolveRequestUserId(request);
      if (!userId) {
        return NextResponse.json({ found: false, paid: false }, { status: 401 });
      }
      const admin = getSupabaseAdminClient();
      const { data: order } = await admin.from("commerce_orders").select("user_id").eq("id", orderId).maybeSingle();
      if (!order) {
        return NextResponse.json({ found: false, paid: false }, { status: 404 });
      }
      if (!ownerMayRecover(typeof order.user_id === "string" ? order.user_id : null, userId)) {
        return NextResponse.json({ found: false, paid: false }, { status: 403 });
      }
    }

    const result = await settlePendingCommercePaymentByOrderId(orderId);
    if (result.kind === "not_found") {
      return NextResponse.json({ found: false, paid: false }, { status: 404 });
    }
    if (result.kind === "error") {
      return NextResponse.json({ found: true, paid: false, pending: false }, { status: 409 });
    }
    if (result.kind === "pending") {
      return NextResponse.json({ found: true, paid: false, pending: true });
    }
    if (result.kind === "failed") {
      return NextResponse.json({ found: true, paid: false, pending: false, orderId: result.orderId });
    }
    return NextResponse.json({
      found: true,
      paid: true,
      pending: false,
      orderId: result.orderId,
      reviewRequired: result.reviewRequired,
    });
  } catch (error) {
    console.error("iyzico recover error", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ found: false, paid: false }, { status: 500 });
  }
}
