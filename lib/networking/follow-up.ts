import { assertNetworkDailyCap, assertVerifiedNetworkMailSender, debitNetworkMail } from "../commerce/packages";
import { sendNetworkingFollowUpEmail, sendOrganizationNetworkMailLimitEmail } from "../email/resend";
import { recordSystemError } from "../observability/system-errors";
import { recordOrganizationAuditEvent } from "../organizations/audit";
import type { getSupabaseAdminClient } from "../supabase/server-admin";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

export type NetworkFollowUpResult =
  | { ok: true; remaining: number }
  | { ok: false; status: number; error: string; reason?: string };

type ConsumeRow = {
  ok?: boolean;
  remaining?: number;
  debit?: number;
  entitlement_id?: string;
  code?: string;
};

const ORGANIZATION_NETWORK_MAIL_ALERT_THRESHOLDS = new Set([20, 10, 3]);

async function notifyOrganizationNetworkMailThreshold(input: {
  admin: AdminClient;
  organizationId: string;
  organizationName: string;
  remaining: number;
}) {
  if (!ORGANIZATION_NETWORK_MAIL_ALERT_THRESHOLDS.has(input.remaining)) return;

  const { data: recipients, error } = await input.admin
    .from("organization_members")
    .select("email")
    .eq("organization_id", input.organizationId)
    .eq("status", "ACTIVE")
    .in("role", ["OWNER", "HR"]);

  if (error) {
    void recordSystemError({
      source: "NETWORK_MAIL_THRESHOLD",
      errorCode: "RECIPIENT_LOOKUP_FAILED",
      message: "Network Mail eşik bildirimi alıcıları yüklenemedi.",
      organizationId: input.organizationId,
    });
    return;
  }

  const recipientEmails = [...new Set(
    (recipients || [])
      .map((recipient) => recipient.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  )];
  if (!recipientEmails.length) return;

  const deliveries = await Promise.all(recipientEmails.map(async (to) => {
    try {
      return await sendOrganizationNetworkMailLimitEmail({
        to,
        organizationName: input.organizationName,
        remaining: input.remaining,
      });
    } catch {
      void recordSystemError({
        source: "NETWORK_MAIL_THRESHOLD",
        errorCode: "ALERT_DELIVERY_FAILED",
        message: "Network Mail eşik bildirimi gönderilemedi.",
        organizationId: input.organizationId,
        details: { remaining: input.remaining },
      });
      return { sent: false as const };
    }
  }));
  const sentCount = deliveries.filter((delivery) => delivery.sent).length;
  if (!sentCount) return;

  await recordOrganizationAuditEvent(input.admin, {
    organizationId: input.organizationId,
    actorRole: "SYSTEM",
    action: "NETWORK_MAIL_THRESHOLD_REACHED",
    subjectType: "NETWORK_MAIL",
    summary: `Network Mail kullanım hakkı ${input.remaining} seviyesine ulaştı.`,
    metadata: { remaining: input.remaining, recipientCount: sentCount },
  });
}

async function refundConsumedCredit(
  admin: AdminClient,
  ledger:
    | { kind: "organization"; organizationId: string }
    | { kind: "individual"; entitlementId: string },
  amount: number,
) {
  if (ledger.kind === "organization") {
    const { error } = await admin.rpc("refund_organization_network_mail", {
      p_organization_id: ledger.organizationId,
      p_amount: amount,
    });
    if (error) {
      void recordSystemError({
        source: "NETWORK_MAIL_REFUND",
        errorCode: "ORGANIZATION_REFUND_FAILED",
        message: "Kurumsal Network Mail kredi iadesi tamamlanamadı.",
        organizationId: ledger.organizationId,
      });
    }
    return;
  }
  const { error } = await admin.rpc("refund_individual_network_mail", {
    p_entitlement_id: ledger.entitlementId,
    p_amount: amount,
  });
  if (error) {
    void recordSystemError({
      source: "NETWORK_MAIL_REFUND",
      errorCode: "INDIVIDUAL_REFUND_FAILED",
      message: "Bireysel Network Mail kredi iadesi tamamlanamadı.",
    });
  }
}

export async function sendDebitedNetworkFollowUp(input: {
  admin: AdminClient;
  ledger: { kind: "organization"; organizationId: string } | { kind: "individual"; userId: string };
  lead: { id: string; email: string; full_name: string };
  mail: { subject: string; message: string };
  sender: { email?: string | null; emailConfirmedAt?: string | Date | null };
  displayName: string;
  sentToday: number;
}): Promise<NetworkFollowUpResult> {
  const preview = debitNetworkMail({ remaining: 1, recipientCount: 1, kind: "NETWORK" });
  if (!preview.ok) {
    return { ok: false, status: 409, error: "Network Mail kredisi bu istek için kullanılamaz.", reason: preview.reason };
  }
  if (!assertNetworkDailyCap(input.sentToday, 1)) {
    return { ok: false, status: 429, error: "Günlük Network Mail limiti doldu. İstek kredi düşmez." };
  }
  const sender = assertVerifiedNetworkMailSender({
    email: input.sender.email,
    emailConfirmedAt: input.sender.emailConfirmedAt,
  });
  if (!sender.ok) {
    const message = sender.reason === "SENDER_EMAIL_UNVERIFIED"
      ? "Network Mail göndermek için e-posta adresini doğrula. Kredi düşülmedi."
      : "Gönderen e-posta doğrulanamadı. Kredi düşülmedi.";
    return { ok: false, status: 403, error: message, reason: sender.reason };
  }

  const consume = input.ledger.kind === "organization"
    ? await input.admin.rpc("consume_organization_network_mail", {
      p_organization_id: input.ledger.organizationId,
      p_debit: preview.debit,
    })
    : await input.admin.rpc("consume_individual_network_mail", {
      p_user_id: input.ledger.userId,
      p_debit: preview.debit,
    });

  const consumed = (consume.data as ConsumeRow | null) || null;
  if (consume.error || !consumed?.ok) {
    return {
      ok: false,
      status: 409,
      error: input.ledger.kind === "individual"
        ? "Bireysel Premium Network Mail kredisi yok veya bitti. İstek kredi düşmez."
        : "Network Mail kredisi kalmadı. İstek kredi düşmez.",
      reason: consumed?.code || consume.error?.message || "INSUFFICIENT_NETWORK_MAIL",
    };
  }

  const refundLedger = input.ledger.kind === "organization"
    ? { kind: "organization" as const, organizationId: input.ledger.organizationId }
    : { kind: "individual" as const, entitlementId: String(consumed.entitlement_id || "") };
  if (refundLedger.kind === "individual" && !consumed.entitlement_id) {
    void recordSystemError({
      source: "NETWORK_MAIL_FOLLOW_UP",
      errorCode: "ENTITLEMENT_NOT_RETURNED",
      message: "Bireysel Network Mail kredi düşümü geçerli bir hak kaydı döndürmedi.",
    });
    return { ok: false, status: 503, error: "Kredi düşümü doğrulanamadı. Mail gönderilmedi." };
  }

  const sent = await sendNetworkingFollowUpEmail({
    to: input.lead.email,
    organizationName: input.displayName,
    subject: input.mail.subject,
    message: input.mail.message,
    replyTo: sender.replyTo,
  }).catch(() => {
    void recordSystemError({
      source: "NETWORK_MAIL_FOLLOW_UP",
      errorCode: "EMAIL_PROVIDER_FAILED",
      message: "Network Mail sağlayıcısı takip e-postasını gönderemedi.",
      organizationId: input.ledger.kind === "organization" ? input.ledger.organizationId : null,
    });
    return { sent: false as const, reason: "PROVIDER_ERROR" };
  });

  if (!sent.sent) {
    await refundConsumedCredit(input.admin, refundLedger, preview.debit);
    const message = sent.reason === "RESEND_API_KEY_MISSING"
      ? "Network Mail servisi yapılandırılmamış. Gönderim yapılmadı ve kredi iade edildi."
      : "Tanıtım maili gönderilemedi. Kredi iade edildi.";
    return { ok: false, status: 503, error: message, reason: sent.reason };
  }

  await input.admin.from("networking_leads").update({ status: "MAIL_SENT", updated_at: new Date().toISOString() }).eq("id", input.lead.id);
  await input.admin.from("networking_lead_events").insert({
    lead_id: input.lead.id,
    kind: "MAIL_SENT",
    payload: {
      template: "CUSTOM",
      subject: input.mail.subject,
      messagePreview: input.mail.message.slice(0, 240),
      credited: true,
      ledger: input.ledger.kind === "organization" ? "NETWORK" : "INDIVIDUAL_PREMIUM",
      debit: preview.debit,
    },
  });

  if (input.ledger.kind === "organization") {
    await notifyOrganizationNetworkMailThreshold({
      admin: input.admin,
      organizationId: input.ledger.organizationId,
      organizationName: input.displayName,
      remaining: Number(consumed.remaining ?? 0),
    });
  }

  return { ok: true, remaining: Number(consumed.remaining ?? 0) };
}

export async function countMailSentToday(admin: AdminClient, leadIds: string[]) {
  if (!leadIds.length) return 0;
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("networking_lead_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", "MAIL_SENT")
    .in("lead_id", leadIds)
    .gte("created_at", dayStart.toISOString());
  return count ?? 0;
}
