import type { SupabaseClient } from "@supabase/supabase-js";

export const ACCOUNT_ROUTE_LOGIN = "/giris?next=%2Fkartlarim";
export const ACCOUNT_ROUTE_CORPORATE = "/kurumsal/panel";
export const ACCOUNT_ROUTE_INDIVIDUAL = "/kartlarim";
export const ACCOUNT_ROUTE_EMPLOYEE = "/kartim";
export const ACCOUNT_ROUTE_SERVER = "/hesabim";

const DEFAULT_WORKSPACE_PATHS = new Set([
  ACCOUNT_ROUTE_CORPORATE,
  ACCOUNT_ROUTE_INDIVIDUAL,
  ACCOUNT_ROUTE_EMPLOYEE,
  ACCOUNT_ROUTE_SERVER,
]);

/**
 * Client-side account routing intentionally stops at `/hesabim` for corporate-like
 * accounts. The final OWNER/ADMIN/HR/DEPARTMENT_MANAGER vs EMPLOYEE decision is
 * DB-backed and server-side in `resolveServerAccountDestination`.
 */
export async function resolveAccountDestination(
  supabase: SupabaseClient | null,
  options?: { onOrganizationCheckError?: (error: unknown) => void },
): Promise<string> {
  if (!supabase) return ACCOUNT_ROUTE_LOGIN;

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return ACCOUNT_ROUTE_LOGIN;

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("account_type,test_login_scope")
    .eq("id", session.user.id)
    .maybeSingle();

  if (accountError) {
    options?.onOrganizationCheckError?.(accountError);
    return ACCOUNT_ROUTE_SERVER;
  }

  if (!account?.account_type) return ACCOUNT_ROUTE_LOGIN;
  if (account.account_type === "INDIVIDUAL") return ACCOUNT_ROUTE_INDIVIDUAL;

  if (
    account.account_type === "CORPORATE"
    || (account.account_type === "TEST" && account.test_login_scope !== "INDIVIDUAL")
  ) {
    return ACCOUNT_ROUTE_SERVER;
  }

  return ACCOUNT_ROUTE_INDIVIDUAL;
}

export function isDefaultWorkspacePath(path: string) {
  return DEFAULT_WORKSPACE_PATHS.has(path);
}

/**
 * Business logins with a default workspace target always pass through the
 * server account router. Explicit targets such as checkout remain untouched.
 */
export async function resolveLoginDestination(
  supabase: SupabaseClient | null,
  portal: "individual" | "business",
  requestedPath: string,
  options?: { onOrganizationCheckError?: (error: unknown) => void },
): Promise<string> {
  if (!isDefaultWorkspacePath(requestedPath)) return requestedPath;
  if (portal === "business") return ACCOUNT_ROUTE_SERVER;
  return resolveAccountDestination(supabase, options);
}
