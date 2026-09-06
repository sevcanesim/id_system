import { NextRequest, NextResponse } from "next/server";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { clearSessionCookies } from "../../../../lib/auth/http-only-session";
import { getSupabaseUserClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  clearSessionCookies(response);
  if (identity) await getSupabaseUserClient(identity.accessToken).auth.signOut({ scope: "local" }).catch(() => undefined);
  return response;
}
