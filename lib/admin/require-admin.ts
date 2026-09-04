import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { assuranceLevelFromToken, type AuthenticatorAssuranceLevel } from "../auth/assurance";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../supabase/server-admin";

type VerifiedSuperAdmin = {
  user: User;
  admin: ReturnType<typeof getSupabaseAdminClient>;
  aal: AuthenticatorAssuranceLevel;
};

/** Confirms the session belongs to a Super Admin without requiring MFA yet. */
export async function requireSuperAdminIdentity(request: NextRequest): Promise<VerifiedSuperAdmin | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;

  const admin = getSupabaseAdminClient();
  const { data: row, error: adminError } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !row) return null;
  return { user: data.user, admin, aal: assuranceLevelFromToken(token) };
}

/** All normal Super Admin APIs require a verified MFA challenge (AAL2). */
export async function requireSuperAdmin(request: NextRequest): Promise<VerifiedSuperAdmin | null> {
  const context = await requireSuperAdminIdentity(request);
  if (!context || context.aal !== "aal2") return null;
  return context;
}
