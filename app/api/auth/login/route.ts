import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isPortalAllowed, type AccountType, type LoginPortal, type TestLoginScope } from "../../../../lib/auth/account-type";
import { normalizeEmail, validateEmail } from "../../../../lib/auth/credentials";
import { logAuthLoginEvent } from "../../../../lib/auth/login-audit";
import {
  isLoginErrorCode,
  loginPagePath,
  parseLoginPortal,
  resolveLoginReturnPath,
  type LoginErrorCode,
  wrongPortalErrorCode,
} from "../../../../lib/auth/login-search";
import {
  PRODUCTION_TEST_LOGIN_MESSAGE,
  productionTestLoginBlocked,
} from "../../../../lib/auth/production-test-gate";
import { readAccountRecord } from "../../../../lib/auth/session-identity";
import { applySessionCookies } from "../../../../lib/auth/http-only-session";
import { consumeDistributedRateLimit, requestIp } from "../../../../lib/security/rate-limit";
import { limitAuthLoginIp } from "../../../../lib/security/route-rate-limits";
import { getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../lib/observability/system-errors";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(72),
  remember: z.boolean().optional(),
});

type LoginFields = {
  email: string;
  password: string;
  remember: boolean;
  portal: LoginPortal;
  next: string;
  viaForm: boolean;
};

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

function loginFlooded() {
  return noStore(NextResponse.json({
    error: "Çok fazla giriş denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.",
    code: "RATE_LIMITED",
  }, { status: 429 }));
}

function isFormContentType(contentType: string) {
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

async function readLoginFields(request: NextRequest): Promise<LoginFields | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return null;
    return {
      email: parsed.data.email,
      password: parsed.data.password,
      remember: Boolean(parsed.data.remember),
      portal: "individual",
      next: "/kartlarim",
      viaForm: false,
    };
  }
  if (!isFormContentType(contentType)) return null;
  const form = await request.formData();
  const portal = parseLoginPortal(String(form.get("portal") ?? ""));
  const rememberRaw = form.get("remember");
  return {
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    remember: rememberRaw === "on" || rememberRaw === "true" || rememberRaw === "1",
    portal,
    next: resolveLoginReturnPath(portal, String(form.get("next") ?? "") || null),
    viaForm: true,
  };
}

function formRedirect(request: NextRequest, portal: LoginPortal, next: string, error?: LoginErrorCode) {
  const path = error ? loginPagePath(portal, next, { error }) : next;
  return noStore(NextResponse.redirect(new URL(path, request.url), 303));
}

function fail(
  request: NextRequest,
  viaForm: boolean,
  portal: LoginPortal,
  next: string,
  status: number,
  error: string,
  code: string,
) {
  if (viaForm) {
    return formRedirect(request, portal, next, isLoginErrorCode(code) ? code : "LOGIN_UNAVAILABLE");
  }
  return noStore(NextResponse.json({ error, code }, { status }));
}

export async function POST(request: NextRequest) {
  const ip = requestIp(request.headers);
  let viaForm = isFormContentType(request.headers.get("content-type") ?? "");
  let portal: LoginPortal = "individual";
  let next = "/kartlarim";
  try {
    const fields = await readLoginFields(request);
    if (!fields) {
      logAuthLoginEvent({ ok: false, reason: "invalid_payload", ip });
      return fail(request, viaForm, portal, next, 400, "E-posta veya şifre hatalı.", "INVALID_CREDENTIALS");
    }
    viaForm = fields.viaForm;
    portal = fields.portal;
    next = fields.next;

    const email = normalizeEmail(fields.email);
    if (validateEmail(email) || !fields.password || fields.password.length > 72) {
      logAuthLoginEvent({ ok: false, reason: "invalid_email", ip, email });
      return fail(request, viaForm, portal, next, 400, "E-posta veya şifre hatalı.", "INVALID_CREDENTIALS");
    }

    if (productionTestLoginBlocked({ email })) {
      logAuthLoginEvent({ ok: false, reason: "test_account_blocked", ip, email });
      return fail(request, viaForm, portal, next, 403, PRODUCTION_TEST_LOGIN_MESSAGE, "TEST_ACCOUNT_BLOCKED");
    }

    const [emailLimit, ipLimit] = await Promise.all([
      consumeDistributedRateLimit({
        key: `auth-login-email:${email}`,
        limit: 10,
        windowMs: 60_000,
        failClosed: false,
      }),
      limitAuthLoginIp(ip),
    ]);
    if (!ipLimit.allowed) {
      logAuthLoginEvent({ ok: false, reason: "rate_limited_ip", ip, email });
      return viaForm ? fail(request, true, portal, next, 429, "Çok fazla giriş denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.", "RATE_LIMITED") : loginFlooded();
    }
    if (!emailLimit.allowed) {
      logAuthLoginEvent({ ok: false, reason: "rate_limited_email", ip, email });
      return viaForm ? fail(request, true, portal, next, 429, "Çok fazla giriş denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.", "RATE_LIMITED") : loginFlooded();
    }

    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.signInWithPassword({ email, password: fields.password });
    if (error || !data.session || !data.user) {
      logAuthLoginEvent({ ok: false, reason: "invalid_credentials", ip, email });
      return fail(request, viaForm, portal, next, 401, "E-posta veya şifre hatalı.", "INVALID_CREDENTIALS");
    }

    const account = await readAccountRecord(data.session.access_token, data.user.id);
    const accountType = account.accountType;
    if (productionTestLoginBlocked({ email: data.user.email ?? email, accountType })) {
      logAuthLoginEvent({ ok: false, reason: "test_account_blocked", ip, email: data.user.email ?? email, userId: data.user.id });
      return fail(request, viaForm, portal, next, 403, PRODUCTION_TEST_LOGIN_MESSAGE, "TEST_ACCOUNT_BLOCKED");
    }

    if (
      viaForm
      && accountType
      && !isPortalAllowed(
        accountType as AccountType,
        portal,
        account.testLoginScope as TestLoginScope | null,
      )
    ) {
      logAuthLoginEvent({ ok: false, reason: "wrong_portal", ip, email: data.user.email ?? email, userId: data.user.id });
      return fail(
        request,
        true,
        portal,
        next,
        403,
        "Bu hesap seçilen giriş sekmesiyle uyuşmuyor.",
        wrongPortalErrorCode(accountType as AccountType, account.testLoginScope as TestLoginScope | null),
      );
    }

    const expiresAt = data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
    const sessionTokens = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt,
      remember: fields.remember,
    };
    logAuthLoginEvent({ ok: true, reason: "signed_in", ip, email: data.user.email ?? email, userId: data.user.id });

    if (viaForm) {
      const response = NextResponse.redirect(new URL(next, request.url), 303);
      applySessionCookies(response, sessionTokens);
      return noStore(response);
    }

    const response = NextResponse.json({ ok: true });
    applySessionCookies(response, sessionTokens);
    return noStore(response);
  } catch {
    void recordSystemError({
      source: "AUTH_LOGIN",
      errorCode: "LOGIN_UNAVAILABLE",
      message: "Password login could not complete.",
    });
    logAuthLoginEvent({ ok: false, reason: "server_error", ip });
    return fail(request, viaForm, portal, next, 503, "Giriş şu anda tamamlanamıyor. Lütfen yeniden dene.", "LOGIN_UNAVAILABLE");
  }
}
