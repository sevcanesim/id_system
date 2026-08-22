import type { NextRequest, NextResponse } from "next/server";
import { productionTestLoginBlocked } from "./production-test-gate";

export const ACCESS_COOKIE = "yenomi-access-token";
export const REFRESH_COOKIE = "yenomi-refresh-token";
export const REMEMBER_COOKIE = "yenomi-session-remember";
export const SESSION_RESTORE_HEADER = "x-yenomi-session";
export const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function isTrustedSessionRestoreRequest(headers: Headers): boolean {
  if (headers.get(SESSION_RESTORE_HEADER) !== "1") return false;
  const dest = (headers.get("sec-fetch-dest") || "").toLowerCase();
  const mode = (headers.get("sec-fetch-mode") || "").toLowerCase();
  if (dest === "document" || dest === "iframe" || dest === "embed" || dest === "object") return false;
  if (mode === "navigate") return false;
  return true;
}

export type HttpOnlySessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  remember: boolean;
};

type CookieResponse = Pick<NextResponse, "cookies">;

function cookieBase() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

function supabasePublicConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return null;
  return { url, key };
}

export function readSessionCookie(request: NextRequest, name: string): string | null {
  const raw = request.cookies.get(name)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

const JWT_SUBJECT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const withPad = padded + "=".repeat((4 - (padded.length % 4)) % 4);
    const json = JSON.parse(atob(withPad)) as unknown;
    return json && typeof json === "object" && !Array.isArray(json) ? json as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function jwtExpiresAt(token: string): number | null {
  const payload = decodeJwtPayload(token);
  return payload && typeof payload.exp === "number" ? payload.exp : null;
}

export function jwtSubject(token: string): string | null {
  const payload = decodeJwtPayload(token);
  const sub = payload && typeof payload.sub === "string" ? payload.sub : "";
  return JWT_SUBJECT_RE.test(sub) ? sub : null;
}

export function jwtEmail(token: string): string | null {
  const payload = decodeJwtPayload(token);
  const email = payload && typeof payload.email === "string" ? payload.email.trim() : "";
  return email || null;
}

export async function resolveRequestUserId(request: NextRequest): Promise<string | null> {
  const accessToken = readSessionCookie(request, ACCESS_COOKIE);
  if (!accessToken) return null;
  if (!(await accessTokenIsValid(accessToken))) return null;
  return jwtSubject(accessToken);
}

export function applySessionCookies(response: CookieResponse, tokens: HttpOnlySessionTokens) {
  const base = cookieBase();
  const accessMaxAge = Math.max(60, tokens.expiresAt - Math.floor(Date.now() / 1000));
  response.cookies.set({
    name: ACCESS_COOKIE,
    value: encodeURIComponent(tokens.accessToken),
    ...base,
    ...(tokens.remember ? { maxAge: accessMaxAge } : {}),
  });
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: encodeURIComponent(tokens.refreshToken),
    ...base,
    ...(tokens.remember ? { maxAge: REMEMBER_MAX_AGE_SECONDS } : {}),
  });
  if (tokens.remember) {
    response.cookies.set({
      name: REMEMBER_COOKIE,
      value: "1",
      ...base,
      maxAge: REMEMBER_MAX_AGE_SECONDS,
    });
  } else {
    response.cookies.set({
      name: REMEMBER_COOKIE,
      value: "",
      ...base,
      maxAge: 0,
    });
  }
}

export function clearSessionCookies(response: CookieResponse) {
  const base = cookieBase();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      ...base,
      maxAge: 0,
    });
  }
}

export async function accessTokenIsValid(accessToken: string): Promise<boolean> {
  const config = supabasePublicConfig();
  if (!config) return false;
  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function refreshGoTrueSession(refreshToken: string): Promise<Omit<HttpOnlySessionTokens, "remember"> | null> {
  const config = supabasePublicConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_at?: unknown;
      expires_in?: unknown;
    };
    if (typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") return null;
    const expiresAt =
      typeof payload.expires_at === "number" && payload.expires_at > 1_000_000_000
        ? payload.expires_at
        : typeof payload.expires_in === "number"
          ? Math.floor(Date.now() / 1000) + payload.expires_in
          : jwtExpiresAt(payload.access_token) ?? Math.floor(Date.now() / 1000) + 3600;
    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt,
    };
  } catch {
    return null;
  }
}

function isProductionTestSessionToken(accessToken: string): boolean {
  return productionTestLoginBlocked({ email: jwtEmail(accessToken) });
}

export async function resolveMiddlewareSession(request: NextRequest): Promise<
  | { allow: true; rotated?: HttpOnlySessionTokens }
  | { allow: false }
> {
  const remember = readSessionCookie(request, REMEMBER_COOKIE) === "1";
  const accessToken = readSessionCookie(request, ACCESS_COOKIE);
  const refreshToken = readSessionCookie(request, REFRESH_COOKIE);

  if (accessToken && (await accessTokenIsValid(accessToken))) {
    if (isProductionTestSessionToken(accessToken)) return { allow: false };
    return { allow: true };
  }

  if (!refreshToken) return { allow: false };
  const rotated = await refreshGoTrueSession(refreshToken);
  if (!rotated) return { allow: false };
  if (isProductionTestSessionToken(rotated.accessToken)) return { allow: false };
  return { allow: true, rotated: { ...rotated, remember } };
}

export async function resolveRestorableSession(request: NextRequest): Promise<
  | { ok: true; tokens: HttpOnlySessionTokens; rotated: boolean }
  | { ok: false }
> {
  const remember = readSessionCookie(request, REMEMBER_COOKIE) === "1";
  const accessToken = readSessionCookie(request, ACCESS_COOKIE);
  const refreshToken = readSessionCookie(request, REFRESH_COOKIE);

  if (accessToken && refreshToken && (await accessTokenIsValid(accessToken))) {
    const expiresAt = jwtExpiresAt(accessToken) ?? Math.floor(Date.now() / 1000) + 3600;
    return { ok: true, rotated: false, tokens: { accessToken, refreshToken, expiresAt, remember } };
  }

  if (!refreshToken) return { ok: false };
  const rotated = await refreshGoTrueSession(refreshToken);
  if (!rotated) return { ok: false };
  return { ok: true, rotated: true, tokens: { ...rotated, remember } };
}
