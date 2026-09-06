import { getSupabaseAdminClient } from "../supabase/server-admin";
import { recordSystemError } from "../observability/system-errors";
import type { OrganizationRole } from "./permissions";

type OrganizationAuditClient = ReturnType<typeof getSupabaseAdminClient>;

export type OrganizationAuditAction =
  | "MEMBER_INVITED"
  | "MEMBER_IDENTITY_UPDATED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_STATUS_CHANGED"
  | "CONTENT_URL_SAVED"
  | "CONTENT_PUBLICATION_CHANGED"
  | "CONTENT_ROLLED_BACK"
  | "CONTENT_REMOVED"
  | "SECURITY_POLICY_CHANGED"
  | "NETWORK_MAIL_THRESHOLD_REACHED";

export type OrganizationAuditEventInput = {
  organizationId: string;
  actorUserId?: string | null;
  actorRole: OrganizationRole | "SYSTEM";
  action: OrganizationAuditAction;
  subjectType: "MEMBER" | "CORPORATE_LINK" | "SECURITY_POLICY" | "NETWORK_MAIL";
  subjectId?: string | null;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordOrganizationAuditEvent(
  admin: OrganizationAuditClient,
  event: OrganizationAuditEventInput,
) {
  const { error } = await admin.from("organization_audit_events").insert({
    organization_id: event.organizationId,
    actor_user_id: event.actorUserId || null,
    actor_role: event.actorRole,
    action: event.action,
    subject_type: event.subjectType,
    subject_id: event.subjectId || null,
    summary: event.summary,
    metadata: event.metadata || {},
  });

  if (error) {
    void recordSystemError({
      source: "ORGANIZATION_AUDIT",
      errorCode: "AUDIT_APPEND_FAILED",
      message: "Kurumsal denetim kaydı yazılamadı.",
      organizationId: event.organizationId,
      details: {
        action: event.action,
        databaseCode: error.code ?? null,
      },
    });
  }
}
