import type { SupabaseClient } from "@supabase/supabase-js";

export const ACCOUNT_ROUTE_LOGIN = "/giris?next=%2Fkartlarim";
export const ACCOUNT_ROUTE_CORPORATE = "/kurumsal/panel";
export const ACCOUNT_ROUTE_INDIVIDUAL = "/kartlarim";
export const ACCOUNT_ROUTE_EMPLOYEE = "/kartim";

type OrganizationsMineResponse = { organizations?: Array<{ organization_id: string }> };

const DEFAULT_WORKSPACE_PATHS = new Set([
  ACCOUNT_ROUTE_CORPORATE,
  ACCOUNT_ROUTE_INDIVIDUAL,
  ACCOUNT_ROUTE_EMPLOYEE,
  "/hesabim",
]);

async function hasManagementOrganization(accessToken: string): Promise<boolean> {
  const response = await fetch("/api/organizations/mine?management=true", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return false;
  const payload = (await response.json()) as OrganizationsMineResponse;
  return (payload.organizations ?? []).length > 0;
}

/**
 * `/hesabim`'in tek karar noktası: oturum var mı, varsa yönetim yetkisi olan
 * aktif bir şirket üyeliği var mı — buna göre kurumsal panele mi bireysel
 * kart alanına mı yönlendirileceğine karar verir.
 *
 * Route component'inden çıkarıldı ki (a) unit test edilebilsin, (b) hata
 * durumu component içinde sessizce yutulmak yerine çağırana bildirilsin.
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

  if (!accountError && account?.account_type) {
    if (account.account_type === "INDIVIDUAL") return ACCOUNT_ROUTE_INDIVIDUAL;

    // Şirket hesabı ve kurumsal test hesapları yönetim yetkisine göre ayrılır:
    // OWNER/ADMIN/HR/DEPARTMENT_MANAGER panele, EMPLOYEE Kartım'a gider.
    if (account.account_type === "CORPORATE" || (account.account_type === "TEST" && account.test_login_scope !== "INDIVIDUAL")) {
      try {
        return (await hasManagementOrganization(session.access_token))
          ? ACCOUNT_ROUTE_CORPORATE
          : ACCOUNT_ROUTE_EMPLOYEE;
      } catch (error) {
        options?.onOrganizationCheckError?.(error);
        return ACCOUNT_ROUTE_EMPLOYEE;
      }
    }
    return ACCOUNT_ROUTE_INDIVIDUAL;
  }

  if (accountError) options?.onOrganizationCheckError?.(accountError);
  // Hesap türü bulunamadığında güvenli varsayılan bireysel alan değildir:
  // kullanıcıyı karar veremediği bir panele düşürmek yerine giriş akışına geri
  // gönderiyoruz. Login tarafı account_type doğrulamasını tekrar yapar.
  return ACCOUNT_ROUTE_LOGIN;
}

export function isDefaultWorkspacePath(path: string) {
  return DEFAULT_WORKSPACE_PATHS.has(path);
}

/**
 * İş portalından girişte varsayılan next (/kurumsal/panel) çalışanı yönetici
 * paneline kilitlemesin. Checkout gibi açık hedefler korunur.
 */
export async function resolveLoginDestination(
  supabase: SupabaseClient | null,
  portal: "individual" | "business",
  requestedPath: string,
  options?: { onOrganizationCheckError?: (error: unknown) => void },
): Promise<string> {
  if (!isDefaultWorkspacePath(requestedPath)) return requestedPath;
  if (portal === "business") return resolveAccountDestination(supabase, options);
  return requestedPath;
}
