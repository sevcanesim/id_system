import type { NextRequest } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../supabase/server-admin";

type AuthenticatorAssuranceLevel = "aal1" | "aal2" | null;

type VerifiedSuperAdmin = {
  user: Awaited<ReturnType<ReturnType<typeof getSupabaseAuthClient>["auth"]["getUser"]>>["data"]["user"];
  admin: ReturnType<typeof getSupabaseAdminClient>;
  aal: AuthenticatorAssuranceLevel;
};

function assuranceLevelFromToken(token: string): AuthenticatorAssuranceLevel {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { aal?: unknown };
    return decoded.aal === "aal2" ? "aal2" : decoded.aal === "aal1" ? "aal1" : null;
  } catch {
    return null;
  }
}

/**
 * Confirms the bearer token belongs to a real Super Admin. This intentionally
 * does not require MFA so the security setup/status surface can be reached
 * before the first TOTP factor has been enrolled.
 */
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

/**
 * All normal Super Admin APIs require an AAL2 access token. Supabase issues
 * AAL2 only after a verified MFA challenge, so password/session possession
 * alone is insufficient for privileged administration.
 */
export async function requireSuperAdmin(request: NextRequest): Promise<VerifiedSuperAdmin | null> {
  const context = await requireSuperAdminIdentity(request);
  if (!context || context.aal !== "aal2") return null;
  return context;
}
