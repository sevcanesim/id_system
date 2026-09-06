import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  isTrustedSessionRestoreRequest,
  readSessionCookie,
  resolveRestorableSession,
  accessTokenIsValid,
} from "../../../../../lib/auth/http-only-session";
import { readAccountRecord } from "../../../../../lib/auth/session-identity";
import {
  PRODUCTION_TEST_LOGIN_MESSAGE,
  productionTestLoginBlocked,
} from "../../../../../lib/auth/production-test-gate";
import { recordSystemError } from "../../../../../lib/observability/system-errors";
import { getSupabaseAuthClient } from "../../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

function clearSession(response: NextResponse) {
  clearSessionCookies(response);
  return noStore(response);
}

export async function GET(request: NextRequest) {
  try {
    if (!isTrustedSessionRestoreRequest(request.headers)) {
      return noStore(NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 }));
    }

    const resolved = await resolveRestorableSession(request);
    if (!resolved.ok) {
      const response = NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
      const accessToken = readSessionCookie(request, ACCESS_COOKIE);
      if (!accessToken || !(await accessTokenIsValid(accessToken))) clearSessionCookies(response);
      return noStore(response);
    }

    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.getUser(resolved.tokens.accessToken);
    if (error || !data.user) {
      return clearSession(NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 }));
    }

    const account = await readAccountRecord(resolved.tokens.accessToken, data.user.id);
    if (productionTestLoginBlocked({ email: data.user.email, accountType: account.accountType })) {
      return clearSession(NextResponse.json({ error: PRODUCTION_TEST_LOGIN_MESSAGE }, { status: 403 }));
    }

    const response = NextResponse.json({
      user: { id: data.user.id, email: data.user.email ?? null },
      account: { type: account.accountType, testLoginScope: account.testLoginScope },
    });
    if (resolved.rotated) applySessionCookies(response, resolved.tokens);
    return noStore(response);
  } catch {
    void recordSystemError({
      source: "AUTH_SESSION_IDENTITY",
      errorCode: "SESSION_IDENTITY_FAILED",
      message: "The browser session identity could not be resolved.",
    });
    return noStore(NextResponse.json({ error: "Oturum okunamadı." }, { status: 500 }));
  }
}
