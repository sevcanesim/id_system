import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendActivationEmail } from "../../../../../lib/email/resend";
import { loadCommerceOrderKind } from "../../../../../lib/commerce/order-kind";
import { publicSiteUrl } from "../../../../../lib/payments/config";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { getDatabaseLifecycleSettings } from "../../../../../lib/config/database";
import { requestIp } from "../../../../../lib/security/rate-limit";
import { limitActivationResendIp, limitActivationResendOrder } from "../../../../../lib/security/route-rate-limits";

export const runtime = "nodejs";
const schema = z.object({ email: z.string().trim().email(), orderNumber: z.string().trim().min(4).max(80).optional() });
const genericOk = { ok: true, message: "Uygun bir sipariş bulunursa yeni bağlantı gönderildi." };
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Geçerli e-posta gir." }, { status: 400 });
    const ipLimit = await limitActivationResendIp(requestIp(request.headers));
    if (!ipLimit.allowed) return NextResponse.json({ error: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
    const admin = getSupabaseAdminClient();
    let query = admin.from("commerce_orders").select("id,order_number,guest_email,status,user_id,activation_deadline_at").eq("guest_email", parsed.data.email.toLowerCase()).eq("status", "PAID").is("user_id", null).order("created_at", { ascending: false }).limit(1);
    if (parsed.data.orderNumber) query = query.eq("order_number", parsed.data.orderNumber);
    const { data: order } = await query.maybeSingle();
    // Hesap varlığını ifşa etmemek için her durumda aynı yanıt.
    if (!order || (order.activation_deadline_at && new Date(order.activation_deadline_at) < new Date())) return NextResponse.json(genericOk);
    const orderLimit = await limitActivationResendOrder(order.id);
    if (!orderLimit.allowed) return NextResponse.json(genericOk);
    await admin.from("activation_tokens").update({ used_at: new Date().toISOString() }).eq("order_id", order.id).is("used_at", null);
    const rawToken = randomBytes(32).toString("hex");
    const { activationResendHours } = await getDatabaseLifecycleSettings();
    const expires = new Date(); expires.setHours(expires.getHours() + activationResendHours);
    await admin.from("activation_tokens").insert({ order_id: order.id, token_hash: createHash("sha256").update(rawToken).digest("hex"), expires_at: expires.toISOString() });
    const activationUrl = `${publicSiteUrl}/aktivasyon?token=${encodeURIComponent(rawToken)}`;
    const mail = await sendActivationEmail({
      to: order.guest_email,
      activationUrl,
      orderNumber: order.order_number,
      hoursValid: activationResendHours,
      audience: (await loadCommerceOrderKind(admin, order.id)).corporate ? "corporate" : "individual",
    });
    await admin.from("commerce_email_events").insert({
      order_id: order.id,
      event_type: "ACTIVATION_RESEND",
      recipient: order.guest_email,
      status: mail.sent ? "SENT" : "SKIPPED",
      provider_message: mail.sent ? null : mail.reason,
    });
    return NextResponse.json(genericOk);
  } catch (error) {
    console.error("activation resend error", error);
    return NextResponse.json({ error: "Aktivasyon bağlantısı yenilenemedi." }, { status: 500 });
  }
}
