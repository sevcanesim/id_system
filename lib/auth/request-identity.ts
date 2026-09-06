import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, readSessionCookie } from "./http-only-session";
import { getSupabaseAuthClient } from "../supabase/server-admin";

export type RequestIdentity = {
  user: User;
  accessToken: string;
};

export function readRequestAccessToken(request: NextRequest): string | null {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return bearer || readSessionCookie(request, ACCESS_COOKIE);
}

export async function resolveRequestIdentity(request: NextRequest): Promise<RequestIdentity | null> {
  const accessToken = readRequestAccessToken(request);
  if (!accessToken) return null;

  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { user: data.user, accessToken };
}
