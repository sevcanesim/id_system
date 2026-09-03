import { hydrateBrowserSessionFromCookies } from "../supabase/browser";
import type { LoginPortal } from "./account-type";

export type PasswordLoginResult =
  | { ok: true }
  | { ok: false; message: string; code?: string };

/**
 * Password sign-in goes through Next.js so Redis rate-limit and the
 * production test-account gate actually see the attempt. Tokens stay in the
 * HttpOnly cookies; the browser client hydrates memory storage afterwards.
 */
export async function passwordLogin(input: {
  email: string;
  password: string;
  remember?: boolean;
  portal?: LoginPortal;
}): Promise<PasswordLoginResult> {
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        remember: Boolean(input.remember),
        portal: input.portal,
      }),
    });
  } catch {
    return { ok: false, message: "Giriş hizmetine ulaşılamadı. Bağlantını kontrol edip yeniden dene." };
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: unknown; code?: unknown };
  const message = typeof payload.error === "string" && payload.error
    ? payload.error
    : "E-posta veya şifre hatalı.";
  const code = typeof payload.code === "string" ? payload.code : undefined;
  if (!response.ok) return { ok: false, message, code };

  const hydrated = await hydrateBrowserSessionFromCookies();
  if (!hydrated) return { ok: false, message: "Oturum kaydedilemedi. Lütfen yeniden dene." };
  return { ok: true };
}
