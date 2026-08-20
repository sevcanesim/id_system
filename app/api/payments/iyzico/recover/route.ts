import { NextRequest, NextResponse } from "next/server";
import { settlePendingCommercePaymentByOrderId } from "../../../../../lib/payments/settle-commerce-payment";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public recover for a charged iyzico checkout whose callback POST never
 * arrived. Looks up the unguessable order UUID, retrieves the checkout token
 * from commerce_payment_attempts, then runs the same settlement path as the
 * callback. GET order-status remains side-effect free.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String((body as { orderId?: unknown }).orderId || "");
    if (!UUID_RE.test(orderId)) {
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
    console.error("iyzico recover error", error);
    return NextResponse.json({ found: false, paid: false }, { status: 500 });
  }
}
