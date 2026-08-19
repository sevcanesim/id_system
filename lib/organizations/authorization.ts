import type { NextRequest } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../supabase/server-admin";
import { isOrganizationRole, type OrganizationRole } from "./permissions";

export type OrganizationActor = {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  status: string;
  department: string | null;
};

/**
 * Server-only authorization primitive. Middleware remains the authentication
 * boundary; this helper is the authorization boundary for Server Actions and
 * API handlers that need an organization-scoped role decision.
 */
export async function getOrganizationActor(request: NextRequest, organizationId: string): Promise<OrganizationActor | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !organizationId) return null;

  const auth = getSupabaseAuthClient();
  const { data: authData } = await auth.auth.getUser(token);
  if (!authData.user) return null;

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("organization_id,role,status,department")
    .eq("organization_id", organizationId)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!data || !isOrganizationRole(data.role) || data.status !== "ACTIVE") return null;

  return {
    userId: authData.user.id,
    organizationId,
    role: data.role,
    status: data.status,
    department: data.department ?? null,
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
