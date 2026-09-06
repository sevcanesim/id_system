import type { NextRequest } from "next/server";
import { assuranceLevelFromToken } from "../auth/assurance";
import { readRequestAccessToken } from "../auth/request-identity";
import { getSupabaseAdminClient } from "../supabase/server-admin";

type OrganizationSecurityClient = ReturnType<typeof getSupabaseAdminClient>;

export type OrganizationSecurityPolicy = {
  requireMfaForCriticalActions: boolean;
  updatedAt: string | null;
};

const defaultPolicy: OrganizationSecurityPolicy = {
  requireMfaForCriticalActions: false,
  updatedAt: null,
};

function isMissingSecurityPolicyRelation(code?: string) {
  return code === "42P01" || code === "PGRST205";
}

/** Reads the tenant policy with a safe default while the migration is rolling out. */
export async function getOrganizationSecurityPolicy(
  admin: OrganizationSecurityClient,
  organizationId: string,
): Promise<{ policy: OrganizationSecurityPolicy; migrationPending: boolean }> {
  const { data, error } = await admin
    .from("organization_security_policies")
    .select("require_mfa_for_critical_actions,updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (isMissingSecurityPolicyRelation(error.code)) return { policy: defaultPolicy, migrationPending: true };
    throw error;
  }

  return {
    policy: {
      requireMfaForCriticalActions: Boolean(data?.require_mfa_for_critical_actions),
      updatedAt: data?.updated_at || null,
    },
    migrationPending: false,
  };
}

/**
 * A critical organization operation must be stepped up to AAL2 when its
 * owner enabled that policy. This check belongs in every mutation endpoint,
 * never only in the browser UI.
 */
export async function requiresOrganizationMfaStepUp(
  request: NextRequest,
  admin: OrganizationSecurityClient,
  organizationId: string,
) {
  const { policy } = await getOrganizationSecurityPolicy(admin, organizationId);
  if (!policy.requireMfaForCriticalActions) return false;
  const token = readRequestAccessToken(request) || "";
  return assuranceLevelFromToken(token) !== "aal2";
}

export const MFA_REQUIRED_MESSAGE = "Bu şirket için kritik işlemler ek doğrulama (MFA) gerektirir.";
