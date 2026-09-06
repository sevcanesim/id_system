import { NextRequest, NextResponse } from "next/server";
import { checkoutResumeCodeExpiry, createCheckoutResumeCode, hashCheckoutResumeCode } from "../../../../../../lib/commerce/checkout-resume";
import { publicError } from "../../../../../../lib/errors";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../../../lib/observability/system-errors";
import { resolveRequestIdentity } from "../../../../../../lib/auth/request-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json(publicError("VALIDATION_ERROR", { message: "Sipariş kimliği geçersiz." }), { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: order, error: orderError } = await admin
    .from("commerce_orders")
    .select("id,status,user_id")
    .eq("id", orderId)
    .eq("user_id", identity.user.id)
    .maybeSingle();

  if (orderError) {
    void recordSystemError({
      source: "COMMERCE_ORDER_RESUME",
      errorCode: "OWNERSHIP_LOOKUP_FAILED",
      message: "Sipariş sahipliği doğrulanamadı.",
      userId: identity.user.id,
    });
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
    void recordSystemError({
      source: "COMMERCE_ORDER_RESUME",
      errorCode: "SESSION_LOOKUP_FAILED",
      message: "Ödeme devam oturumu yüklenemedi.",
      userId: identity.user.id,
    });
    return NextResponse.json({ error: "Ödeme bilgileri şu anda geri yüklenemiyor." }, { status: 503 });
  }
  if (!session?.draft_payload) {
    return NextResponse.json({ error: "Bu siparişin güvenli ödeme taslağı artık mevcut değil. Sepetten yeniden ödeme başlatabilirsin." }, { status: 410 });
  }

  const resumeCode = createCheckoutResumeCode();
  const { error: resumeCodeError } = await admin.from("commerce_checkout_resume_codes").upsert({
    order_id: order.id,
    code_hash: hashCheckoutResumeCode(resumeCode),
    expires_at: checkoutResumeCodeExpiry().toISOString(),
    redeemed_at: null,
  }, { onConflict: "order_id" });
  if (resumeCodeError) {
    void recordSystemError({
      source: "COMMERCE_ORDER_RESUME",
      errorCode: "CODE_CREATION_FAILED",
      message: "Ödeme devam bağlantısı oluşturulamadı.",
      userId: identity.user.id,
    });
    return NextResponse.json({ error: "Ödeme devam bağlantısı oluşturulamadı." }, { status: 503 });
  }

  return NextResponse.json(
    { href: `/checkout?resume=${encodeURIComponent(resumeCode)}` },
    { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } },
  );
}
