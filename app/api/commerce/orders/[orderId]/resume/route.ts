import { NextRequest, NextResponse } from "next/server";
import { createCheckoutResumeToken } from "../../../../../../lib/commerce/checkout-resume";
import { publicError } from "../../../../../../lib/errors";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../../../lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

  const auth = getSupabaseAuthClient();
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json(publicError("VALIDATION_ERROR", { message: "Sipariş kimliği geçersiz." }), { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: order, error: orderError } = await admin
    .from("commerce_orders")
    .select("id,status,user_id")
    .eq("id", orderId)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (orderError) {
    console.error("order payment resume ownership lookup failed", { orderId, code: orderError.code });
    return NextResponse.json(publicError("ORDER_LOAD_FAILED"), { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  if (order.status !== "AWAITING_PAYMENT" && order.status !== "DRAFT") {
    return NextResponse.json({ error: "Bu sipariş artık ödeme beklemiyor." }, { status: 409 });
  }

  const { data: session, error: sessionError } = await admin
    .from("commerce_checkout_sessions")
    .select("order_id,expires_at,draft_payload")
    .eq("order_id", order.id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionError) {
    console.error("order payment resume session lookup failed", { orderId, code: sessionError.code });
    return NextResponse.json({ error: "Ödeme bilgileri şu anda geri yüklenemiyor." }, { status: 503 });
  }
  if (!session?.draft_payload) {
    return NextResponse.json({ error: "Bu siparişin güvenli ödeme taslağı artık mevcut değil. Sepetten yeniden ödeme başlatabilirsin." }, { status: 410 });
  }

  const resumeToken = createCheckoutResumeToken(order.id, session.expires_at);
  if (!resumeToken) {
    console.error("order payment resume token could not be created", { orderId });
    return NextResponse.json({ error: "Ödeme devam bağlantısı oluşturulamadı." }, { status: 503 });
  }

  return NextResponse.json(
    { href: `/checkout?resume=${encodeURIComponent(resumeToken)}` },
    { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } },
  );
}
