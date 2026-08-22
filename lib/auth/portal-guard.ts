import type { SupabaseClient } from "@supabase/supabase-js";
import { AccountType, canUseCardWorkspace, isPortalAllowed, LoginPortal, TestLoginScope, wrongPortalMessage } from "./account-type";

export type PortalCheckResult = { ok: true; message: "" } | { ok: false; message: string };

/**
 * Bir kullanıcının seçtiği portalda (bireysel/kurumsal) oturum açmasına izin
 * olup olmadığını `user_accounts` tablosundaki `account_type`/`test_login_scope`
 * alanlarına göre doğrular.
 *
 * `/giris` sayfasında bu mantık iki yerde aynen tekrarlanıyordu: (1) mount
 * sırasında zaten açık bir oturum bulunduğunda, (2) yeni giriş/kayıt işlemi
 * başarılı olduğunda. Component'ten çıkarıldı ki tek yerden test edilebilsin
 * ve iki kopya birbirinden sessizce sapmasın.
 */
const PORTAL_VALIDATION_ATTEMPTS = 3;
const PORTAL_VALIDATION_DELAY_MS = 250;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Auth can complete a fraction of a second before the user_accounts row is
 * visible to the browser query (notably for newly-created/demo accounts).
 * Treat a missing/error row as transient for a short bounded window instead
 * of surfacing a false "account type could not be verified" error on the
 * first login attempt. Portal authorization remains fail-closed after the
 * bounded retry budget is exhausted.
 */
export async function validatePortal(
  supabase: SupabaseClient,
  userId: string,
  selectedPortal: LoginPortal,
): Promise<PortalCheckResult> {
  for (let attempt = 0; attempt < PORTAL_VALIDATION_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from("user_accounts")
      .select("account_type,test_login_scope")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data?.account_type) {
      const accountType = data.account_type as AccountType;
      const testScope = data.test_login_scope as TestLoginScope | null;

      return isPortalAllowed(accountType, selectedPortal, testScope)
        ? { ok: true, message: "" }
        : { ok: false, message: wrongPortalMessage(accountType, testScope) };
    }

    if (attempt < PORTAL_VALIDATION_ATTEMPTS - 1) {
      await wait(PORTAL_VALIDATION_DELAY_MS * (attempt + 1));
    }
  }

  return { ok: false, message: "Hesap türü doğrulanamadı. Lütfen destek ekibiyle iletişime geçin." };
}

/**
 * Kartım / Kartlarım kabuğu: kurumsal çalışan, yönetim paneline düşmeden
 * kendi kart çalışma alanını kullanabilir. Giriş sekmesi hâlâ validatePortal.
 */
export async function validateCardWorkspace(
  supabase: SupabaseClient,
  userId: string,
): Promise<PortalCheckResult> {
  for (let attempt = 0; attempt < PORTAL_VALIDATION_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from("user_accounts")
      .select("account_type,test_login_scope")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data?.account_type) {
      const accountType = data.account_type as AccountType;
      const testScope = data.test_login_scope as TestLoginScope | null;
      return canUseCardWorkspace(accountType, testScope)
        ? { ok: true, message: "" }
        : { ok: false, message: wrongPortalMessage(accountType, testScope) };
    }

    if (attempt < PORTAL_VALIDATION_ATTEMPTS - 1) {
      await wait(PORTAL_VALIDATION_DELAY_MS * (attempt + 1));
    }
  }

  return { ok: false, message: "Hesap türü doğrulanamadı. Lütfen destek ekibiyle iletişime geçin." };
}

/**
 * `/api/admin/session`'ı sorgulayıp verilen erişim jetonunun bir admin
 * oturumuna ait olup olmadığını döner.
 *
 * `/giris`'te aynı fetch+kontrol de iki yerde (mount sırasında mevcut oturum
 * kontrolünde, ve başarılı giriş/kayıt sonrasında) birebir tekrarlanıyordu.
 */
export async function isAdminSession(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("/api/admin/session", {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { admin?: boolean };
    return Boolean(payload.admin);
  } catch {
    // A hung admin check must not pin the user on /giris after a 200 login.
    return false;
  }
}
