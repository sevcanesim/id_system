import type { SupabaseClient } from "@supabase/supabase-js";

export const ACCOUNT_ROUTE_LOGIN = "/giris?next=%2Fhesabim";
export const ACCOUNT_ROUTE_ADMIN = "/admin/operations";
export const ACCOUNT_ROUTE_CORPORATE = "/kurumsal/panel";
export const ACCOUNT_ROUTE_INDIVIDUAL = "/kartim";
export const ACCOUNT_ROUTE_EMPLOYEE = "/kartim";
export const ACCOUNT_ROUTE_SERVER = "/hesabim";

const DEFAULT_WORKSPACE_PATHS = new Set([
  ACCOUNT_ROUTE_CORPORATE,
  ACCOUNT_ROUTE_INDIVIDUAL,
  ACCOUNT_ROUTE_EMPLOYEE,
  ACCOUNT_ROUTE_SERVER,
  "/kartlarim",
]);

/**
 * Browser routing never asks the user to choose an account type. The browser
 * only determines whether the authenticated account is individual-like or
 * needs the DB-backed server router. Admin and corporate role resolution stay
 * server-side at `/hesabim`.
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

  if (!account?.account_type) return ACCOUNT_ROUTE_SERVER;
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
 * Legacy callers may still pass a portal value. It is intentionally ignored:
 * workspace selection is derived from account data, not user choice.
 */
export async function resolveLoginDestination(
  supabase: SupabaseClient | null,
  _portal: "individual" | "business",
  requestedPath: string,
  options?: { onOrganizationCheckError?: (error: unknown) => void },
): Promise<string> {
  if (!isDefaultWorkspacePath(requestedPath)) return requestedPath;
  return resolveAccountDestination(supabase, options);
}
