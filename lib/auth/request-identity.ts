import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, readSessionCookie } from "./http-only-session";
import { getSupabaseAuthClient } from "../supabase/server-admin";

export type RequestIdentity = {
  user: User;
  accessToken: string;
};

function hasBearerCredential(request: NextRequest) {
  return Boolean(request.headers.get("authorization")?.match(/^Bearer\s+\S+$/i));
}

function isUnsafeMethod(request: NextRequest) {
  return !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
}

function hasTrustedSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin";
}

export function readRequestAccessToken(request: NextRequest): string | null {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return bearer || readSessionCookie(request, ACCESS_COOKIE);
}

export async function resolveRequestIdentity(request: NextRequest): Promise<RequestIdentity | null> {
  if (isUnsafeMethod(request) && !hasBearerCredential(request) && !hasTrustedSameOrigin(request)) return null;
  const accessToken = readRequestAccessToken(request);
  if (!accessToken) return null;

  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { user: data.user, accessToken };
}
