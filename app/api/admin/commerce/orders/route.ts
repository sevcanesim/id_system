import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "../../../../../lib/admin/require-admin";
import { sendActivationEmail, sendShippingEmail } from "../../../../../lib/email/resend";
import { canTransitionCommerceOrder, COMMERCE_ORDER_STATUSES, type CommerceOrderStatus } from "../../../../../lib/commerce/order-status";
import { loadCommerceOrderKind } from "../../../../../lib/commerce/order-kind";
import { publicError } from "../../../../../lib/errors";
import { publicSiteUrl } from "../../../../../lib/payments/config";
import { getDatabaseLifecycleSettings } from "../../../../../lib/config/database";
import { recordSystemError } from "../../../../../lib/observability/system-errors";
import { transientTokenUrl } from "../../../../../lib/security/transient-link";

export const runtime = "nodejs";
const patchSchema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["UPDATE_ORDER", "RESEND_ACTIVATION"]).default("UPDATE_ORDER"),
  status: z.enum(COMMERCE_ORDER_STATUSES).optional(),
  trackingCompany: z.string().trim().max(80).optional().nullable(),
  trackingNumber: z.string().trim().max(120).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await requireSuperAdmin(request);
    if (!context) return NextResponse.json({ error: "Yönetici yetkisi ve MFA doğrulaması gerekli." }, { status: 403 });
    const { data, error } = await context.admin
      .from("commerce_orders")
      .select("id,order_number,customer_name,customer_phone,guest_email,status,total_kurus,currency,paid_at,created_at,updated_at,tracking_company,tracking_number,shipped_at,delivered_at,activation_claimed_at,company_name,tax_number,tax_office,commerce_order_items(id,product_name,product_kind,quantity,unit_price_kurus,configuration),shipping_addresses(recipient_name,phone,address_line,district,city,postal_code,delivery_note)")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json(publicError("ORDER_LOAD_FAILED"), { status: 500 });
    return NextResponse.json({ orders: data ?? [] });
  } catch {
    void recordSystemError({
      source: "ADMIN_COMMERCE_ORDERS",
      errorCode: "ORDER_LIST_FAILED",
      message: "Super Admin sipariş listesi yüklenemedi.",
    });
    return NextResponse.json({ error: "Siparişler yüklenemedi." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await requireSuperAdmin(request);
    if (!context) return NextResponse.json({ error: "Yönetici yetkisi ve MFA doğrulaması gerekli." }, { status: 403 });
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz işlem." }, { status: 400 });
    const { data: currentOrder, error: currentOrderError } = await context.admin
      .from("commerce_orders")
      .select("status,guest_email,order_number,user_id,activation_deadline_at")
      .eq("id", parsed.data.orderId)
      .maybeSingle();
    if (currentOrderError || !currentOrder) return NextResponse.json(publicError("ORDER_LOAD_FAILED"), { status: 404 });

    if (parsed.data.action === "RESEND_ACTIVATION") {
      if (currentOrder.status !== "PAID" || currentOrder.user_id) {
        return NextResponse.json({ error: "Yalnızca ödemesi alınmış ve henüz hesaba bağlanmamış siparişler için aktivasyon gönderilebilir." }, { status: 409 });
      }
      if (currentOrder.activation_deadline_at && new Date(currentOrder.activation_deadline_at) < new Date()) {
        return NextResponse.json({ error: "Siparişin aktivasyon süresi sona ermiş." }, { status: 410 });
      }
      await context.admin.from("activation_tokens").update({ used_at: new Date().toISOString() }).eq("order_id", parsed.data.orderId).is("used_at", null);
      const rawToken = randomBytes(32).toString("hex");
      const expires = new Date();
      const { activationResendHours } = await getDatabaseLifecycleSettings();
      expires.setHours(expires.getHours() + activationResendHours);
      const { error: tokenError } = await context.admin.from("activation_tokens").insert({
        order_id: parsed.data.orderId,
        token_hash: createHash("sha256").update(rawToken).digest("hex"),
        expires_at: expires.toISOString(),
      });
      if (tokenError) return NextResponse.json({ error: "Aktivasyon bağlantısı oluşturulamadı." }, { status: 500 });
      const kind = await loadCommerceOrderKind(context.admin, parsed.data.orderId);
      const mail = await sendActivationEmail({
        to: currentOrder.guest_email,
        activationUrl: transientTokenUrl(publicSiteUrl, "/aktivasyon", rawToken),
        orderNumber: currentOrder.order_number,
        hoursValid: activationResendHours,
        audience: kind.corporate ? "corporate" : "individual",
      });
      await context.admin.from("commerce_email_events").insert({
        order_id: parsed.data.orderId,
        event_type: "ACTIVATION_RESEND",
        recipient: currentOrder.guest_email,
        status: mail.sent ? "SENT" : "SKIPPED",
        provider_message: mail.sent ? null : mail.reason,
      });
      if (!mail.sent) return NextResponse.json({ error: "Aktivasyon e-postası gönderilemedi." }, { status: 502 });
      await context.admin.from("admin_audit_log").insert({
        actor_user_id: context.user.id,
        action: "ACTIVATION_LINK_RESENT",
        target_table: "commerce_orders",
        target_id: parsed.data.orderId,
      });
      return NextResponse.json({ ok: true, message: "Aktivasyon bağlantısı yeniden gönderildi." });
    }

    if (!parsed.data.status) return NextResponse.json({ error: "Sipariş durumu gerekli." }, { status: 400 });
    const currentStatus = currentOrder.status as CommerceOrderStatus;
    if (!canTransitionCommerceOrder(currentStatus, parsed.data.status)) {
      return NextResponse.json(
        { error: `${currentStatus} durumundaki sipariş doğrudan ${parsed.data.status} durumuna geçirilemez.`, code: "INVALID_ORDER_TRANSITION" },
        { status: 409 },
      );
    }
    if (parsed.data.status === "SHIPPED" && (!parsed.data.trackingCompany || !parsed.data.trackingNumber)) {
      return NextResponse.json({ error: "Siparişi kargolandı durumuna geçirmek için kargo firması ve takip numarası zorunludur.", code: "TRACKING_REQUIRED" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const values: Record<string, string | null> = {
      status: parsed.data.status,
      tracking_company: parsed.data.trackingCompany || null,
      tracking_number: parsed.data.trackingNumber || null,
      updated_at: now,
    };
    if (parsed.data.status === "SHIPPED") values.shipped_at = now;
    if (parsed.data.status === "COMPLETED") values.delivered_at = now;
    const { data: updatedOrder, error } = await context.admin
      .from("commerce_orders")
      .update(values)
      .eq("id", parsed.data.orderId)
      .eq("status", currentStatus)
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json(publicError("ORDER_UPDATE_FAILED"), { status: 500 });
    if (!updatedOrder) {
      return NextResponse.json({ error: "Sipariş durumu başka bir işlem tarafından değiştirildi. Güncel durumu yenileyip tekrar dene.", code: "ORDER_VERSION_CONFLICT" }, { status: 409 });
    }
    if (parsed.data.status === "SHIPPED") {
      const { data: order } = await context.admin.from("commerce_orders").select("guest_email,order_number").eq("id", parsed.data.orderId).single();
      if (order?.guest_email) {
        const mail = await sendShippingEmail({ to: order.guest_email, orderNumber: order.order_number, company: parsed.data.trackingCompany, tracking: parsed.data.trackingNumber });
        await context.admin.from("commerce_email_events").insert({ order_id: parsed.data.orderId, event_type: "SHIPPING", recipient: order.guest_email, status: mail.sent ? "SENT" : "SKIPPED", provider_message: mail.sent ? null : mail.reason });
      }
    }
    if (parsed.data.status === "REFUNDED") {
      const { data: items } = await context.admin.from("commerce_order_items").select("id").eq("order_id", parsed.data.orderId);
      const itemIds = items?.map((item) => item.id) ?? [];
      if (itemIds.length) {
        await context.admin.from("entitlements").update({ status: "REVOKED" }).in("order_item_id", itemIds);
        await context.admin.from("commerce_physical_card_units").update({ status: "CANCELLED", updated_at: now }).in("order_item_id", itemIds).in("status", ["PENDING_PRODUCTION", "IN_PRODUCTION"]);
      }
    }
    await context.admin.from("commerce_order_status_history").insert({
      order_id: parsed.data.orderId,
      from_status: currentStatus,
      to_status: parsed.data.status,
      changed_by_user_id: context.user.id,
      source: "ADMIN",
      metadata: {
        trackingCompany: parsed.data.trackingCompany || null,
        trackingNumber: parsed.data.trackingNumber || null,
      },
    });
    await context.admin.from("admin_audit_log").insert({
      actor_user_id: context.user.id,
      action: "COMMERCE_ORDER_UPDATED",
      target_table: "commerce_orders",
      target_id: parsed.data.orderId,
      after_value: values,
    });
    return NextResponse.json({ ok: true });
  } catch {
    void recordSystemError({
      source: "ADMIN_COMMERCE_ORDERS",
      errorCode: "ORDER_UPDATE_FAILED",
      message: "Super Admin sipariş güncellemesi tamamlanamadı.",
    });
    return NextResponse.json({ error: "Sipariş güncellenemedi." }, { status: 500 });
  }
}
