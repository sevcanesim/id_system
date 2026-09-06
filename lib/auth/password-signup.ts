import type { LoginPortal } from "./account-type";

export type PasswordSignupResult =
  | { ok: true; requiresConfirmation: true }
  | { ok: true; requiresConfirmation: false; userId: string }
  | { ok: false; message: string; code?: string };

export async function passwordSignup(input: {
  email: string;
  password: string;
  remember: boolean;
  portal: LoginPortal;
  next: string;
}): Promise<PasswordSignupResult> {
  let response: Response;
  try {
    response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, message: "Hesap hizmetine ulaşılamadı. Bağlantını kontrol edip yeniden dene." };
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    code?: unknown;
    requiresConfirmation?: unknown;
    userId?: unknown;
  };
  if (!response.ok) {
    return {
      ok: false,
      message: typeof payload.error === "string" && payload.error ? payload.error : "Hesap şu anda oluşturulamadı.",
      code: typeof payload.code === "string" ? payload.code : undefined,
    };
  }

  if (payload.requiresConfirmation === true) return { ok: true, requiresConfirmation: true };
  if (typeof payload.userId === "string" && payload.userId) {
    return { ok: true, requiresConfirmation: false, userId: payload.userId };
  }
  return { ok: false, message: "Hesap oturumu başlatılamadı. Lütfen yeniden dene." };
}
