import { getSupabaseAdminClient } from "../supabase/server-admin";
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
  | "SECURITY_POLICY_CHANGED";

export type OrganizationAuditEventInput = {
  organizationId: string;
  actorUserId: string;
  actorRole: OrganizationRole;
  action: OrganizationAuditAction;
  subjectType: "MEMBER" | "CORPORATE_LINK" | "SECURITY_POLICY";
  subjectId?: string | null;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
};

/**
 * The trail records operation metadata, not URLs, raw e-mail addresses,
 * access tokens or uploaded file paths. Audit failures are logged for
 * operations staff but never expose database details to the end user.
 */
export async function recordOrganizationAuditEvent(
  admin: OrganizationAuditClient,
  event: OrganizationAuditEventInput,
) {
  const { error } = await admin.from("organization_audit_events").insert({
    organization_id: event.organizationId,
    actor_user_id: event.actorUserId,
    actor_role: event.actorRole,
    action: event.action,
    subject_type: event.subjectType,
    subject_id: event.subjectId || null,
    summary: event.summary,
    metadata: event.metadata || {},
  });

  if (error) {
    console.error("[organization-audit] append failed", {
      organizationId: event.organizationId,
      action: event.action,
      code: error.code,
    });
  }
}
