import type { SupabaseClient } from "@supabase/supabase-js";
import { AccountType, canUseCardWorkspace, LoginPortal, TestLoginScope, wrongPortalMessage } from "./account-type";

export type PortalCheckResult = { ok: true; message: "" } | { ok: false; message: string };

const PORTAL_VALIDATION_ATTEMPTS = 3;
const PORTAL_VALIDATION_DELAY_MS = 250;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Compatibility guard for existing login callers. Account/workspace choice is
 * no longer made by the user, so the selected portal is intentionally ignored.
 * We only require a resolvable account row; the server router decides whether
 * the session belongs to Super Admin, corporate management, employee, or an
 * individual workspace.
 */
export async function validatePortal(
  supabase: SupabaseClient,
  userId: string,
  _selectedPortal: LoginPortal,
): Promise<PortalCheckResult> {
  for (let attempt = 0; attempt < PORTAL_VALIDATION_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from("user_accounts")
      .select("account_type")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data?.account_type) return { ok: true, message: "" };

    if (attempt < PORTAL_VALIDATION_ATTEMPTS - 1) {
      await wait(PORTAL_VALIDATION_DELAY_MS * (attempt + 1));
    }
  }

  return { ok: false, message: "Hesap türü doğrulanamadı. Lütfen destek ekibiyle iletişime geçin." };
}

/**
 * Kartım / Kartlarım kabuğu: kurumsal çalışan, yönetim paneline düşmeden
 * kendi kart çalışma alanını kullanabilir.
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
    return false;
  }
}
