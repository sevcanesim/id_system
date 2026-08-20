import { assertNetworkDailyCap, assertVerifiedNetworkMailSender, debitNetworkMail } from "../commerce/packages";
import { sendNetworkingFollowUpEmail } from "../email/resend";
import type { getSupabaseAdminClient } from "../supabase/server-admin";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

export const NETWORK_FOLLOWUP_TEMPLATES = [
  "EVENT_BEFORE",
  "EVENT_MET",
  "OFFER",
  "AFTER_MEETING",
  "PRESENTATION",
  "EVENT_THANKS",
  "PRODUCT_INFO",
  "CUSTOM",
] as const;

export type NetworkFollowUpTemplate = (typeof NETWORK_FOLLOWUP_TEMPLATES)[number];

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
    if (error) console.error("organization network mail refund failed", error);
    return;
  }
  const { error } = await admin.rpc("refund_individual_network_mail", {
    p_entitlement_id: ledger.entitlementId,
    p_amount: amount,
  });
  if (error) console.error("individual network mail refund failed", error);
}

export async function sendDebitedNetworkFollowUp(input: {
  admin: AdminClient;
  ledger: { kind: "organization"; organizationId: string } | { kind: "individual"; userId: string };
  lead: { id: string; email: string; full_name: string };
  template: NetworkFollowUpTemplate;
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
    console.error("individual network mail consume missing entitlement_id");
    return { ok: false, status: 503, error: "Kredi düşümü doğrulanamadı. Mail gönderilmedi." };
  }

  const sent = await sendNetworkingFollowUpEmail({
    to: input.lead.email,
    organizationName: input.displayName,
    leadName: input.lead.full_name,
    template: input.template,
    replyTo: sender.replyTo,
  }).catch((error) => {
    console.error("network follow-up provider error", error);
    return { sent: false as const, reason: "PROVIDER_ERROR" };
  });

  if (!sent.sent) {
    await refundConsumedCredit(input.admin, refundLedger, preview.debit);
    const message = sent.reason === "RESEND_API_KEY_MISSING"
      ? "Tanıtım maili gönderilemedi: e-posta servisi yapılandırılmamış. Kredi düşülmedi."
      : "Tanıtım maili gönderilemedi. Kredi iade edildi.";
    return { ok: false, status: 503, error: message, reason: sent.reason };
  }

  await input.admin.from("networking_leads").update({ status: "MAIL_SENT", updated_at: new Date().toISOString() }).eq("id", input.lead.id);
  await input.admin.from("networking_lead_events").insert({
    lead_id: input.lead.id,
    kind: "MAIL_SENT",
    payload: {
      template: input.template,
      credited: true,
      ledger: input.ledger.kind === "organization" ? "NETWORK" : "INDIVIDUAL_PREMIUM",
      debit: preview.debit,
    },
  });

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
