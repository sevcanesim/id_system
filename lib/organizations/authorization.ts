import type { NextRequest } from "next/server";
import { resolveRequestIdentity } from "../auth/request-identity";
import { getSupabaseAdminClient } from "../supabase/server-admin";
import { isOrganizationRole, type OrganizationRole } from "./permissions";

export type OrganizationActor = {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  status: string;
  department: string | null;
  email: string | null;
  emailConfirmedAt: string | null;
};

/**
 * Server-only authorization primitive. Middleware remains the authentication
 * boundary; this helper is the authorization boundary for Server Actions and
 * API handlers that need an organization-scoped role decision.
 */
export async function getOrganizationActor(request: NextRequest, organizationId: string): Promise<OrganizationActor | null> {
  if (!organizationId) return null;
  const identity = await resolveRequestIdentity(request);
  if (!identity) return null;

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("organization_id,role,status,department")
    .eq("organization_id", organizationId)
    .eq("user_id", identity.user.id)
    .maybeSingle();

  if (!data || !isOrganizationRole(data.role) || data.status !== "ACTIVE") return null;

  return {
    userId: identity.user.id,
    organizationId,
    role: data.role,
    status: data.status,
    department: data.department ?? null,
    email: identity.user.email ?? null,
    emailConfirmedAt: identity.user.email_confirmed_at ?? null,
  };
}

export async function requireOrganizationRole(
  request: NextRequest,
  organizationId: string,
  allowedRoles: readonly OrganizationRole[],
) {
  const actor = await getOrganizationActor(request, organizationId);
  if (!actor || !allowedRoles.includes(actor.role)) return null;
  return actor;
}
