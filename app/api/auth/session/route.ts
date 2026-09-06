import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  isTrustedSessionRestoreRequest,
  readSessionCookie,
  REFRESH_COOKIE,
  REMEMBER_COOKIE,
} from "../../../../lib/auth/http-only-session";
import {
  PRODUCTION_TEST_LOGIN_MESSAGE,
  productionTestLoginBlocked,
} from "../../../../lib/auth/production-test-gate";
import { readAccountType } from "../../../../lib/auth/session-identity";
import { recordSystemError } from "../../../../lib/observability/system-errors";
import { getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const schema = z.object({
  accessToken: z.string().min(20).max(4000).nullable(),
  refreshToken: z.string().min(10).max(4000).nullable().optional(),
  expiresAt: z.number().int().positive().nullable().optional(),
  remember: z.boolean().optional(),
});

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

function clearSession(response: NextResponse) {
  clearSessionCookies(response);
  return noStore(response);
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedSessionRestoreRequest(request.headers) || request.headers.get("origin") !== request.nextUrl.origin) {
      return clearSession(NextResponse.json({ error: "Oturum isteği doğrulanamadı." }, { status: 403 }));
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return clearSession(NextResponse.json({ error: "Oturum bilgisi geçersiz." }, { status: 400 }));
    }

    if (!parsed.data.accessToken) {
      return clearSession(NextResponse.json({ ok: true }));
    }

    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.getUser(parsed.data.accessToken);
    if (error || !data.user) {
      return clearSession(NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 }));
    }

    const accountType = await readAccountType(parsed.data.accessToken, data.user.id);
    if (productionTestLoginBlocked({ email: data.user.email, accountType })) {
      return clearSession(NextResponse.json({ error: PRODUCTION_TEST_LOGIN_MESSAGE }, { status: 403 }));
    }

    const remember = parsed.data.remember ?? readSessionCookie(request, REMEMBER_COOKIE) === "1";
    const expiresAt = parsed.data.expiresAt ?? Math.floor(Date.now() / 1000) + 3600;
    const refreshToken = parsed.data.refreshToken || readSessionCookie(request, REFRESH_COOKIE);
    const response = NextResponse.json({ ok: true });

    if (refreshToken) {
      applySessionCookies(response, {
        accessToken: parsed.data.accessToken,
        refreshToken,
        expiresAt,
        remember,
      });
    } else {
      const maxAge = Math.max(60, expiresAt - Math.floor(Date.now() / 1000));
      response.cookies.set({
        name: ACCESS_COOKIE,
        value: encodeURIComponent(parsed.data.accessToken),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        ...(remember ? { maxAge } : {}),
      });
    }

    return noStore(response);
  } catch {
    void recordSystemError({
      source: "AUTH_SESSION",
      errorCode: "SESSION_COOKIE_WRITE_FAILED",
      message: "An authenticated session cookie could not be written.",
    });
    return clearSession(NextResponse.json({ error: "Oturum kaydedilemedi." }, { status: 500 }));
  }
}
