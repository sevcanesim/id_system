import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import {
  applySessionCookies,
  jwtExpiresAt,
  REMEMBER_COOKIE,
  readSessionCookie,
} from "../../../../lib/auth/http-only-session";
import { assuranceLevelFromToken } from "../../../../lib/auth/assurance";

export const runtime = "nodejs";

const enrollmentSchema = z.object({ action: z.literal("ENROLL") });
const verificationSchema = z.object({
  action: z.literal("VERIFY"),
  factorId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});
const unenrollmentSchema = z.object({ action: z.literal("UNENROLL"), factorId: z.string().uuid() });

type MfaApiResponse = {
  id?: string;
  totp?: { qr_code?: string; secret?: string };
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apiKey) throw new Error("Supabase Auth yapılandırması eksik.");
  return { url: url.replace(/\/$/, ""), apiKey };
}

async function callMfaApi(
  path: string,
  accessToken: string,
  method: "POST" | "DELETE",
  body?: Record<string, string>,
) {
  const { url, apiKey } = authConfig();
  const response = await fetch(`${url}/auth/v1/factors${path}`, {
    method,
    cache: "no-store",
    headers: {
      apikey: apiKey,
      authorization: `Bearer ${accessToken}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null) as MfaApiResponse | null;
  return { ok: response.ok, payload };
}

export async function GET(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }));

  const factors = (identity.user.factors ?? []).map((factor) => ({
    id: factor.id,
    factor_type: factor.factor_type,
    friendly_name: factor.friendly_name,
    status: factor.status,
  }));
  return noStore(NextResponse.json({ factors, currentLevel: assuranceLevelFromToken(identity.accessToken) }));
}

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }));

  const body = await request.json().catch(() => null);
  const enrollment = enrollmentSchema.safeParse(body);
  const verification = verificationSchema.safeParse(body);
  const unenrollment = unenrollmentSchema.safeParse(body);

  if (enrollment.success) {
    const enrollmentResult = await callMfaApi("", identity.accessToken, "POST", { factor_type: "totp", friendly_name: "Yenomi ID" });
    if (!enrollmentResult.ok || !enrollmentResult.payload?.id || !enrollmentResult.payload.totp?.qr_code || !enrollmentResult.payload.totp.secret) {
      return noStore(NextResponse.json({ error: "Authenticator kurulumu başlatılamadı." }, { status: 503 }));
    }
    return noStore(NextResponse.json({
      factorId: enrollmentResult.payload.id,
      qrCode: `data:image/svg+xml;utf-8,${enrollmentResult.payload.totp.qr_code}`,
      secret: enrollmentResult.payload.totp.secret,
    }));
  }

  if (unenrollment.success) {
    if (assuranceLevelFromToken(identity.accessToken) !== "aal2") {
      return noStore(NextResponse.json({ error: "Authenticator bağlantısını kaldırmak için ek doğrulama gerekli." }, { status: 403 }));
    }
    const removal = await callMfaApi(`/${unenrollment.data.factorId}`, identity.accessToken, "DELETE");
    if (!removal.ok) return noStore(NextResponse.json({ error: "Authenticator bağlantısı kaldırılamadı." }, { status: 409 }));
    return noStore(NextResponse.json({ ok: true }));
  }

  if (!verification.success) return noStore(NextResponse.json({ error: "Doğrulama bilgisi geçersiz." }, { status: 400 }));
  const challenge = await callMfaApi(`/${verification.data.factorId}/challenge`, identity.accessToken, "POST");
  if (!challenge.ok || !challenge.payload?.id) return noStore(NextResponse.json({ error: "Doğrulama başlatılamadı." }, { status: 503 }));

  const verificationResult = await callMfaApi(`/${verification.data.factorId}/verify`, identity.accessToken, "POST", {
    challenge_id: challenge.payload.id,
    code: verification.data.code,
  });
  const session = verificationResult.payload;
  if (!verificationResult.ok || !session?.access_token || !session.refresh_token) {
    return noStore(NextResponse.json({ error: "Kod doğrulanamadı." }, { status: 400 }));
  }

  const expiresAt = jwtExpiresAt(session.access_token) ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
  const response = NextResponse.json({ ok: true });
  applySessionCookies(response, {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt,
    remember: readSessionCookie(request, REMEMBER_COOKIE) === "1",
  });
  return noStore(response);
}
