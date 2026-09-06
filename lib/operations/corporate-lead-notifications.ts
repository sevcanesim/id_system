import { sendCorporateLeadEmail, sendCorporateLeadOpsAlert } from "../email/resend";
import { recordSystemError } from "../observability/system-errors";
import { decryptCorporateLeadPayload } from "../security/corporate-lead-crypto";
import { getSupabaseAdminClient } from "../supabase/server-admin";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;
type NotificationStatus = "PENDING" | "PROCESSING" | "RETRYABLE" | "DELIVERED" | "FAILED" | "LEGACY_UNVERIFIED";
type CorporateLeadNotification = {
  id: string;
  encrypted_payload: string | null;
  plan: string | null;
  notification_attempts: number;
  notification_status: NotificationStatus;
};

function retryAt(attempts: number, now: number) {
  const delayMinutes = Math.min(360, 2 ** Math.min(Math.max(attempts, 1), 8));
  return new Date(now + delayMinutes * 60_000).toISOString();
}

function safeNotificationErrorCode(value: unknown) {
  if (typeof value !== "string") return "CORPORATE_LEAD_NOTIFICATION_FAILED";
  const normalized = value.toUpperCase().replace(/[^A-Z0-9_:-]/g, "_").slice(0, 120);
  return normalized || "CORPORATE_LEAD_NOTIFICATION_FAILED";
}

async function finalizeNotification(
  admin: AdminClient,
  lead: CorporateLeadNotification,
  status: "DELIVERED" | "RETRYABLE" | "FAILED",
  now: number,
  errorCode: string | null,
) {
  const timestamp = new Date(now).toISOString();
  const values: Record<string, string | number | null> = {
    notification_status: status,
    notification_lease_expires_at: null,
    last_notification_error_code: errorCode,
  };
  if (status === "DELIVERED") {
    values.first_notified_at = timestamp;
    values.last_notified_at = timestamp;
    values.notification_next_attempt_at = timestamp;
  } else {
    values.notification_next_attempt_at = status === "FAILED" ? "infinity" : retryAt(lead.notification_attempts + 1, now);
  }
  await admin.from("corporate_leads").update(values).eq("id", lead.id).eq("notification_status", "PROCESSING");
}

export async function deliverCorporateLeadNotifications(
  admin: AdminClient,
  limit = 25,
  now = Date.now(),
  leadId?: string,
) {
  const timestamp = new Date(now).toISOString();
  await admin
    .from("corporate_leads")
    .update({ notification_status: "RETRYABLE", notification_lease_expires_at: null })
    .eq("notification_status", "PROCESSING")
    .lt("notification_lease_expires_at", timestamp);

  let query = admin
    .from("corporate_leads")
    .select("id,encrypted_payload,plan,notification_attempts,notification_status")
    .in("notification_status", ["PENDING", "RETRYABLE"])
    .lte("notification_next_attempt_at", timestamp)
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (leadId) query = query.eq("id", leadId);
  const { data: candidates, error } = await query;
  if (error) throw error;

  let delivered = 0;
  let retried = 0;
  let failed = 0;
  for (const candidate of (candidates ?? []) as CorporateLeadNotification[]) {
    const attempt = candidate.notification_attempts + 1;
    const { data: claimed } = await admin
      .from("corporate_leads")
      .update({
        notification_status: "PROCESSING",
        notification_attempts: attempt,
        notification_lease_expires_at: new Date(now + 10 * 60_000).toISOString(),
      })
      .eq("id", candidate.id)
      .in("notification_status", ["PENDING", "RETRYABLE"])
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const payload = decryptCorporateLeadPayload(candidate.id, candidate.encrypted_payload);
    if (!payload) {
      await finalizeNotification(admin, candidate, "FAILED", now, "CORPORATE_LEAD_PAYLOAD_UNREADABLE");
      void recordSystemError({
        source: "CORPORATE_LEAD",
        errorCode: "CORPORATE_LEAD_PAYLOAD_UNREADABLE",
        message: "Kurumsal teklif talebi içeriği çözülemedi.",
        details: { leadId: candidate.id },
      });
      failed += 1;
      continue;
    }

    const outbound = await sendCorporateLeadEmail({
      id: candidate.id,
      fullName: payload.fullName,
      email: payload.email,
      company: payload.company,
      employeeCount: payload.employeeCount,
      message: payload.message,
      plan: candidate.plan || "GENEL",
    });
    if (outbound.sent) {
      await finalizeNotification(admin, candidate, "DELIVERED", now, null);
      void sendCorporateLeadOpsAlert(candidate.id);
      delivered += 1;
      continue;
    }

    const errorCode = safeNotificationErrorCode(outbound.reason);
    const terminal = attempt >= 5 || errorCode === "CORPORATE_LEAD_RECIPIENT_MISSING";
    await finalizeNotification(admin, candidate, terminal ? "FAILED" : "RETRYABLE", now, errorCode);
    if (terminal) {
      void recordSystemError({
        source: "CORPORATE_LEAD",
        errorCode,
        message: "Kurumsal teklif bildirimi teslim edilemedi.",
        details: { leadId: candidate.id, attempts: attempt },
      });
      failed += 1;
    } else {
      retried += 1;
    }
  }

  return { inspected: candidates?.length || 0, delivered, retried, failed };
}
