import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { LoginPortal } from "../../../../lib/auth/account-type";
import { normalizeEmail, validateEmail, validateSignupPassword } from "../../../../lib/auth/credentials";
import { loginPagePath, parseLoginPortal, resolveLoginReturnPath } from "../../../../lib/auth/login-search";
import { logAuthLoginEvent } from "../../../../lib/auth/login-audit";
import { applySessionCookies } from "../../../../lib/auth/http-only-session";
import { PRODUCTION_TEST_LOGIN_MESSAGE, productionTestLoginBlocked } from "../../../../lib/auth/production-test-gate";
import { limitAuthSignupIp } from "../../../../lib/security/route-rate-limits";
import { consumeDistributedRateLimit, requestIp } from "../../../../lib/security/rate-limit";
import { getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../lib/observability/system-errors";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(8).max(72),
  remember: z.boolean(),
  portal: z.enum(["individual", "business"]),
  next: z.string().max(2048),
});

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

function failure(message: string, status: number, code: string) {
  return noStore(NextResponse.json({ error: message, code }, { status }));
}

function callbackUrl(request: NextRequest, portal: LoginPortal, next: string) {
  return new URL(loginPagePath(portal, next), request.url).toString();
}

export async function POST(request: NextRequest) {
  const ip = requestIp(request.headers);
  let email: string | undefined;
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      return failure("Hesap isteği doğrulanamadı.", 403, "ORIGIN_MISMATCH");
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return failure("Hesap bilgileri geçersiz.", 400, "INVALID_SIGNUP");

    email = normalizeEmail(parsed.data.email);
    const emailError = validateEmail(email);
    const passwordError = validateSignupPassword(parsed.data.password);
    if (emailError || passwordError) return failure(emailError ?? passwordError ?? "Hesap bilgileri geçersiz.", 400, "INVALID_SIGNUP");
    if (productionTestLoginBlocked({ email })) {
      logAuthLoginEvent({ ok: false, reason: "test_signup_blocked", ip, email });
      return failure(PRODUCTION_TEST_LOGIN_MESSAGE, 403, "TEST_ACCOUNT_BLOCKED");
    }

    const [emailLimit, ipLimit] = await Promise.all([
      consumeDistributedRateLimit({ key: `auth-signup-email:${email}`, limit: 5, windowMs: 15 * 60_000, failClosed: true }),
      limitAuthSignupIp(ip),
    ]);
    if (!emailLimit.allowed || !ipLimit.allowed) {
      logAuthLoginEvent({ ok: false, reason: "signup_rate_limited", ip, email });
      return failure("Çok fazla hesap oluşturma denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.", emailLimit.unavailable || ipLimit.unavailable ? 503 : 429, "RATE_LIMITED");
    }

    const portal = parseLoginPortal(parsed.data.portal);
    const next = resolveLoginReturnPath(portal, parsed.data.next);
    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.signUp({
      email,
      password: parsed.data.password,
      options: { emailRedirectTo: callbackUrl(request, portal, next) },
    });

    const duplicate = error?.code === "user_already_exists" || error?.code === "email_exists" || Boolean(data.user && data.user.identities?.length === 0);
    if (error || duplicate || !data.user) {
      logAuthLoginEvent({ ok: false, reason: duplicate ? "signup_duplicate_or_unconfirmed" : "signup_failed", ip, email });
      return noStore(NextResponse.json({ ok: true, requiresConfirmation: true }));
    }

    if (!data.session) {
      logAuthLoginEvent({ ok: true, reason: "signup_confirmation_required", ip, email, userId: data.user.id });
      return noStore(NextResponse.json({ ok: true, requiresConfirmation: true }));
    }

    const response = NextResponse.json({ ok: true, requiresConfirmation: false, userId: data.user.id });
    applySessionCookies(response, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      remember: parsed.data.remember,
    });
    logAuthLoginEvent({ ok: true, reason: "signup_signed_in", ip, email, userId: data.user.id });
    return noStore(response);
  } catch {
    void recordSystemError({
      source: "AUTH_SIGNUP",
      errorCode: "SIGNUP_UNAVAILABLE",
      message: "Password signup could not complete.",
    });
    logAuthLoginEvent({ ok: false, reason: "signup_server_error", ip, email });
    return failure("Hesap şu anda oluşturulamadı. Lütfen yeniden dene.", 503, "SIGNUP_UNAVAILABLE");
  }
}
