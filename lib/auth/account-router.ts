import type { SupabaseClient } from "@supabase/supabase-js";

export const ACCOUNT_ROUTE_LOGIN = "/giris?next=%2Fkartlarim";
export const ACCOUNT_ROUTE_CORPORATE = "/kurumsal/panel";
export const ACCOUNT_ROUTE_INDIVIDUAL = "/kartlarim";

type OrganizationsMineResponse = { organizations?: Array<{ organization_id: string }> };

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
    if (account.account_type === "CORPORATE") return ACCOUNT_ROUTE_CORPORATE;
    if (account.account_type === "INDIVIDUAL") return ACCOUNT_ROUTE_INDIVIDUAL;

    // TEST/BOTH hesaplarında demo hesabın gerçekten bir kurumsal yönetim
    // bağlamı olup olmadığını kontrol et. Bu istisna, normal kullanıcıların
    // yönlendirmesini organizasyon üyeliğine bağlamaz.
    if (account.account_type === "TEST" && account.test_login_scope !== "INDIVIDUAL") {
      try {
        const response = await fetch("/api/organizations/mine?management=true", {
          headers: { authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (response.ok) {
          const payload = (await response.json()) as OrganizationsMineResponse;
          if ((payload.organizations ?? []).length > 0) return ACCOUNT_ROUTE_CORPORATE;
        }
      } catch (error) {
        options?.onOrganizationCheckError?.(error);
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
