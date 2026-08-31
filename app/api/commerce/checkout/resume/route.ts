import { NextRequest, NextResponse } from "next/server";
import { verifyCheckoutResumeToken } from "../../../../../lib/commerce/checkout-resume";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const verified = verifyCheckoutResumeToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Devam bağlantısının süresi dolmuş veya geçersiz." }, { status: 410 });
  }

  const admin = getSupabaseAdminClient();
  const { data: session, error } = await admin
    .from("commerce_checkout_sessions")
    .select("order_id,draft_payload,expires_at,commerce_orders(status)")
    .eq("order_id", verified.orderId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("checkout resume lookup failed", { orderId: verified.orderId, message: error.message });
    return NextResponse.json({ error: "Sipariş taslağı şu anda yüklenemiyor." }, { status: 503 });
  }

  const order = session?.commerce_orders as { status?: string } | { status?: string }[] | null | undefined;
  const status = Array.isArray(order) ? order[0]?.status : order?.status;
  if (!session || status !== "AWAITING_PAYMENT") {
    return NextResponse.json({ error: "Bu sipariş artık ödeme beklemiyor." }, { status: 409 });
  }

  return NextResponse.json(
    { orderId: session.order_id, draft: session.draft_payload },
    { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } },
  );
}
