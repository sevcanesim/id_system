import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, validateEmail } from "../../../../lib/auth/credentials";
import { logAuthLoginEvent } from "../../../../lib/auth/login-audit";
import {
  PRODUCTION_TEST_LOGIN_MESSAGE,
  productionTestLoginBlocked,
} from "../../../../lib/auth/production-test-gate";
import { readAccountType } from "../../../../lib/auth/session-identity";
import { applySessionCookies } from "../../../../lib/auth/http-only-session";
import { consumeDistributedRateLimit, requestIp } from "../../../../lib/security/rate-limit";
import { getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(72),
  remember: z.boolean().optional(),
});

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

export async function POST(request: NextRequest) {
  const ip = requestIp(request.headers);
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      logAuthLoginEvent({ ok: false, reason: "invalid_payload", ip });
      return noStore(NextResponse.json({ error: "E-posta veya şifre hatalı.", code: "INVALID_CREDENTIALS" }, { status: 400 }));
    }

    const email = normalizeEmail(parsed.data.email);
    if (validateEmail(email)) {
      logAuthLoginEvent({ ok: false, reason: "invalid_email", ip, email });
      return noStore(NextResponse.json({ error: "E-posta veya şifre hatalı.", code: "INVALID_CREDENTIALS" }, { status: 400 }));
    }

    const emailLimit = await consumeDistributedRateLimit({
      key: `auth-login-email:${email}`,
      limit: 10,
      windowMs: 60_000,
      failClosed: true,
    });
    if (!emailLimit.allowed) {
      logAuthLoginEvent({ ok: false, reason: emailLimit.unavailable ? "rate_limit_unavailable" : "rate_limited_email", ip, email });
      const status = emailLimit.unavailable ? 503 : 429;
      const code = emailLimit.unavailable ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMITED";
      const error = emailLimit.unavailable
        ? "Güvenlik limiti şu anda doğrulanamıyor. Lütfen kısa süre sonra tekrar deneyin."
        : "Çok fazla giriş denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.";
      return noStore(NextResponse.json({ error, code }, { status }));
    }

    if (productionTestLoginBlocked({ email })) {
      logAuthLoginEvent({ ok: false, reason: "test_account_blocked", ip, email });
      return noStore(NextResponse.json({ error: PRODUCTION_TEST_LOGIN_MESSAGE, code: "TEST_ACCOUNT_BLOCKED" }, { status: 403 }));
    }

    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.signInWithPassword({ email, password: parsed.data.password });
    if (error || !data.session || !data.user) {
      logAuthLoginEvent({ ok: false, reason: "invalid_credentials", ip, email });
      return noStore(NextResponse.json({ error: "E-posta veya şifre hatalı.", code: "INVALID_CREDENTIALS" }, { status: 401 }));
    }

    const accountType = await readAccountType(data.session.access_token, data.user.id);
    if (productionTestLoginBlocked({ email: data.user.email ?? email, accountType })) {
      logAuthLoginEvent({ ok: false, reason: "test_account_blocked", ip, email: data.user.email ?? email, userId: data.user.id });
      return noStore(NextResponse.json({ error: PRODUCTION_TEST_LOGIN_MESSAGE, code: "TEST_ACCOUNT_BLOCKED" }, { status: 403 }));
    }

    const expiresAt = data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
    const response = NextResponse.json({ ok: true });
    applySessionCookies(response, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt,
      remember: Boolean(parsed.data.remember),
    });
    logAuthLoginEvent({ ok: true, reason: "signed_in", ip, email: data.user.email ?? email, userId: data.user.id });
    return noStore(response);
  } catch (error) {
    console.error("auth login error", error instanceof Error ? error.message : "UNKNOWN");
    logAuthLoginEvent({ ok: false, reason: "server_error", ip });
    return noStore(NextResponse.json({ error: "Giriş şu anda tamamlanamıyor. Lütfen yeniden dene.", code: "LOGIN_UNAVAILABLE" }, { status: 503 }));
  }
}
