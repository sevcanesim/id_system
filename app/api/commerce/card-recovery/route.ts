import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseLifecycleSettings } from "../../../../lib/config/database";
import { sendActivationEmail } from "../../../../lib/email/resend";
import { publicSiteUrl } from "../../../../lib/payments/config";
import {
  allowPhysicalCardRecoveryOrder,
  rejectPhysicalCardRecoveryFlood,
} from "../../../../lib/security/route-rate-limits";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../lib/observability/system-errors";

export const runtime = "nodejs";

const schema = z.object({
  cardCode: z.string().trim().regex(/^YN-[A-Z0-9]{12}$/i),
});

const RECOVERABLE_ORDER_STATUSES = new Set(["PAID", "PREPARING", "SHIPPED", "COMPLETED"]);
const GENERIC_MESSAGE = "Kart siparişle doğrulanabiliyorsa aktivasyon bağlantısı siparişteki e-posta adresine gönderilir.";

function accepted() {
  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE }, { status: 202 });
}

export async function POST(request: NextRequest) {
  const flood = await rejectPhysicalCardRecoveryFlood(request);
  if (flood) return flood;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz kart kodu." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const cardCode = parsed.data.cardCode.toUpperCase();
  const { data: card } = await admin
    .from("physical_cards")
    .select("id,status,owner_user_id,owner_profile_id")
    .eq("card_code", cardCode)
    .maybeSingle();

  // Public recovery never reveals whether a valid-looking card or order exists.
  if (!card || card.status !== "UNASSIGNED" || card.owner_user_id || card.owner_profile_id) return accepted();

  const { data: unit } = await admin
    .from("commerce_physical_card_units")
    .select("order_item_id")
    .eq("physical_card_id", card.id)
    .maybeSingle();
  if (!unit?.order_item_id) return accepted();

  const { data: orderItem } = await admin
    .from("commerce_order_items")
    .select("order_id")
    .eq("id", unit.order_item_id)
    .maybeSingle();
  if (!orderItem?.order_id) return accepted();

  const { data: order } = await admin
    .from("commerce_orders")
    .select("id,status,user_id,guest_email,order_number,activation_deadline_at")
    .eq("id", orderItem.order_id)
    .maybeSingle();
  if (
    !order
    || order.user_id
    || !order.guest_email
    || !RECOVERABLE_ORDER_STATUSES.has(String(order.status))
    || (order.activation_deadline_at && new Date(order.activation_deadline_at).getTime() <= Date.now())
  ) {
    return accepted();
  }

  const orderQuota = await allowPhysicalCardRecoveryOrder(order.id);
  if (!orderQuota.allowed) return accepted();

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const { activationResendHours } = await getDatabaseLifecycleSettings();
  const expiresAt = new Date(Date.now() + activationResendHours * 60 * 60 * 1000);

  const { error: invalidateError } = await admin
    .from("activation_tokens")
    .update({ invalidated_at: new Date().toISOString() })
    .eq("order_id", order.id)
    .is("used_at", null)
    .is("invalidated_at", null);
  if (invalidateError) {
    void recordSystemError({
      source: "CARD_RECOVERY",
      errorCode: "TOKEN_INVALIDATION_FAILED",
      message: "Kart kurtarma için eski aktivasyon bağlantıları geçersizleştirilemedi.",
    });
    return accepted();
  }

  const { error: tokenError } = await admin.from("activation_tokens").insert({
    order_id: order.id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });
  if (tokenError) {
    void recordSystemError({
      source: "CARD_RECOVERY",
      errorCode: "TOKEN_CREATION_FAILED",
      message: "Kart kurtarma için aktivasyon bağlantısı oluşturulamadı.",
    });
    return accepted();
  }

  const mail = await sendActivationEmail({
    to: order.guest_email,
    activationUrl: `${publicSiteUrl}/aktivasyon?token=${encodeURIComponent(rawToken)}`,
    orderNumber: order.order_number,
    hoursValid: activationResendHours,
    audience: "individual",
  });

  await admin.from("commerce_email_events").insert({
    order_id: order.id,
    event_type: "ACTIVATION_RESEND",
    recipient: order.guest_email,
    status: mail.sent ? "SENT" : "SKIPPED",
    provider_message: mail.sent ? "physical-card-recovery" : mail.reason,
  });

  return accepted();
}
