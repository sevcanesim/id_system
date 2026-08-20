import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCESS_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  readSessionCookie,
  REFRESH_COOKIE,
  REMEMBER_COOKIE,
  resolveRestorableSession,
  accessTokenIsValid,
} from "../../../../lib/auth/http-only-session";
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

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRestorableSession(request);
    if (!resolved.ok) {
      const response = NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
      const accessToken = readSessionCookie(request, ACCESS_COOKIE);
      const keepAccess = Boolean(accessToken && (await accessTokenIsValid(accessToken)));
      if (!keepAccess) clearSessionCookies(response);
      return noStore(response);
    }

    const response = NextResponse.json({
      accessToken: resolved.tokens.accessToken,
      refreshToken: resolved.tokens.refreshToken,
      expiresAt: resolved.tokens.expiresAt,
    });
    if (resolved.rotated) applySessionCookies(response, resolved.tokens);
    return noStore(response);
  } catch (error) {
    console.error("auth session restore error", error instanceof Error ? error.message : "UNKNOWN");
    return noStore(NextResponse.json({ error: "Oturum okunamadı." }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error("auth session cookie error", error instanceof Error ? error.message : "UNKNOWN");
    return clearSession(NextResponse.json({ error: "Oturum kaydedilemedi." }, { status: 500 }));
  }
}
