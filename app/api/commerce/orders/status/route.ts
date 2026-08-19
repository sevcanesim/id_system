import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

// Order statuses that mean "payment succeeded" from the shopper's point of
// view. Anything else (DRAFT, AWAITING_PAYMENT, CANCELLED, REFUNDED, or an
// unknown/missing order) must never render as a success state.
const PAID_STATUSES = new Set(["PAID", "PREPARING", "SHIPPED", "COMPLETED"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public, unauthenticated order-status check used by the /odeme/basarili and
 * /odeme/basarisiz result pages so they can verify a payment before showing
 * success content. Deliberately returns only a coarse status enum — never
 * email, amount, items, or any other order detail — so it stays safe to call
 * without auth for a guest checkout flow. The order id itself is already a
 * public, unguessable UUID that the payment callback puts in the redirect
 * URL, so exposing this minimal status by id does not leak anything new.
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
      .select("status")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("commerce order status lookup failed", { orderId, error });
      return NextResponse.json({ found: false, paid: false, status: null }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ found: false, paid: false, status: null }, { status: 404 });
    }

    return NextResponse.json({
      found: true,
      paid: PAID_STATUSES.has(String(data.status)),
      status: data.status,
    });
  } catch (error) {
    console.error("commerce order status error", { orderId, error });
    return NextResponse.json({ found: false, paid: false, status: null }, { status: 500 });
  }
}
