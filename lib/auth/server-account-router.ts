import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "./http-only-session";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../supabase/server-admin";
import {
  ACCOUNT_ROUTE_CORPORATE,
  ACCOUNT_ROUTE_EMPLOYEE,
  ACCOUNT_ROUTE_INDIVIDUAL,
  ACCOUNT_ROUTE_LOGIN,
} from "./account-router";

const MANAGEMENT_ROLES = ["OWNER", "ADMIN", "HR", "DEPARTMENT_MANAGER"] as const;

type ServerAccountRouteResult =
  | { ok: true; destination: string }
  | { ok: false; reason: "SESSION_INVALID" | "ACCOUNT_LOOKUP_FAILED" | "ORGANIZATION_LOOKUP_FAILED" };

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function resolveServerAccountDestination(): Promise<ServerAccountRouteResult> {
  const store = await cookies();
  const rawAccessToken = store.get(ACCESS_COOKIE)?.value;
  if (!rawAccessToken) return { ok: true, destination: ACCOUNT_ROUTE_LOGIN };

  const accessToken = decodeCookieValue(rawAccessToken);
  const auth = getSupabaseAuthClient();
  const { data: authData, error: authError } = await auth.auth.getUser(accessToken);
  if (authError || !authData.user) return { ok: false, reason: "SESSION_INVALID" };

  const admin = getSupabaseAdminClient();
  const { data: account, error: accountError } = await admin
    .from("user_accounts")
    .select("account_type,test_login_scope")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (accountError) return { ok: false, reason: "ACCOUNT_LOOKUP_FAILED" };
  if (!account?.account_type) return { ok: true, destination: ACCOUNT_ROUTE_LOGIN };
  if (account.account_type === "INDIVIDUAL") return { ok: true, destination: ACCOUNT_ROUTE_INDIVIDUAL };

  const corporateLike = account.account_type === "CORPORATE"
    || (account.account_type === "TEST" && account.test_login_scope !== "INDIVIDUAL");
  if (!corporateLike) return { ok: true, destination: ACCOUNT_ROUTE_INDIVIDUAL };

  const { data: memberships, error: membershipError } = await admin
    .from("organization_members")
    .select("role")
    .eq("user_id", authData.user.id)
    .eq("status", "ACTIVE");

  if (membershipError) return { ok: false, reason: "ORGANIZATION_LOOKUP_FAILED" };
  const hasManagementAccess = (memberships ?? []).some((membership) =>
    MANAGEMENT_ROLES.includes(membership.role as (typeof MANAGEMENT_ROLES)[number]),
  );

  return {
    ok: true,
    destination: hasManagementAccess ? ACCOUNT_ROUTE_CORPORATE : ACCOUNT_ROUTE_EMPLOYEE,
  };
}
