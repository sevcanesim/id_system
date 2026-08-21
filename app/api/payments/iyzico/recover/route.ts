import { NextRequest, NextResponse } from "next/server";
import { readPendingOrderId, resolveRecoverOrderId } from "../../../../../lib/payments/pending-order-cookie";
import { settlePendingCommercePaymentByOrderId } from "../../../../../lib/payments/settle-commerce-payment";

export const runtime = "nodejs";

/**
 * Public recover for a charged iyzico checkout whose callback POST never
 * arrived. The HttpOnly pending-order cookie is the session source of truth
 * when present; a body order UUID remains valid for email/deep-link recover
 * without that cookie. GET order-status remains side-effect free.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bodyOrderId = String((body as { orderId?: unknown }).orderId || "");
    const resolved = resolveRecoverOrderId(readPendingOrderId(request), bodyOrderId || null);
    if (resolved.mismatch) {
      return NextResponse.json({ found: false, paid: false }, { status: 409 });
    }
    const orderId = resolved.orderId;
    if (!orderId) {
      return NextResponse.json({ found: false, paid: false }, { status: 400 });
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
