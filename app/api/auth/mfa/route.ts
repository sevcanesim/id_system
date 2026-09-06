import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import {
  applySessionCookies,
  jwtExpiresAt,
  REMEMBER_COOKIE,
  readSessionCookie,
} from "../../../../lib/auth/http-only-session";
import { getSupabaseUserClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const enrollmentSchema = z.object({ action: z.literal("ENROLL") });
const verificationSchema = z.object({
  action: z.literal("VERIFY"),
  factorId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }));

  const body = await request.json().catch(() => null);
  const enrollment = enrollmentSchema.safeParse(body);
  const verification = verificationSchema.safeParse(body);
  const client = getSupabaseUserClient(identity.accessToken);

  if (enrollment.success) {
    const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Yenomi Business" });
    if (error || !data?.totp) return noStore(NextResponse.json({ error: "Authenticator kurulumu başlatılamadı." }, { status: 503 }));
    return noStore(NextResponse.json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }));
  }

  if (!verification.success) return noStore(NextResponse.json({ error: "Doğrulama bilgisi geçersiz." }, { status: 400 }));
  const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: verification.data.factorId });
  if (challengeError || !challenge) return noStore(NextResponse.json({ error: "Doğrulama başlatılamadı." }, { status: 503 }));

  const { data, error } = await client.auth.mfa.verify({
    factorId: verification.data.factorId,
    challengeId: challenge.id,
    code: verification.data.code,
  });
  if (error || !data?.access_token || !data.refresh_token) return noStore(NextResponse.json({ error: "Kod doğrulanamadı." }, { status: 400 }));

  const expiresAt = jwtExpiresAt(data.access_token) ?? Math.floor(Date.now() / 1000) + data.expires_in;
  const response = NextResponse.json({ ok: true });
  applySessionCookies(response, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    remember: readSessionCookie(request, REMEMBER_COOKIE) === "1",
  });
  return noStore(response);
}
