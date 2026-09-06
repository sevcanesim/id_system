import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, validateEmail, validateSignupPassword } from "../../../lib/auth/credentials";
import { resolveRequestIdentity } from "../../../lib/auth/request-identity";
import { getSupabaseUserClient } from "../../../lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const accountSchema = z.object({
  name: z.string().trim().max(120),
  email: z.string().trim().min(3).max(254),
});

const passwordSchema = z.object({ password: z.string().min(1).max(72) });

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

function identityAccount(identity: NonNullable<Awaited<ReturnType<typeof resolveRequestIdentity>>>, yenomiId: string | null) {
  const metadata = identity.user.user_metadata ?? {};
  const name = typeof metadata.name === "string"
    ? metadata.name
    : typeof metadata.full_name === "string"
      ? metadata.full_name
      : "";
  const pendingEmail = typeof (identity.user as { new_email?: unknown }).new_email === "string"
    ? (identity.user as { new_email: string }).new_email
    : null;
  return {
    name,
    email: identity.user.email ?? "",
    pendingEmail,
    yenomiId: yenomiId ?? "",
  };
}

export async function GET(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }));

  const client = getSupabaseUserClient(identity.accessToken);
  const { data: account, error } = await client
    .from("user_accounts")
    .select("yenomi_id")
    .eq("id", identity.user.id)
    .maybeSingle();
  if (error) return noStore(NextResponse.json({ error: "Hesap bilgileri yüklenemedi." }, { status: 503 }));

  return noStore(NextResponse.json({ account: identityAccount(identity, typeof account?.yenomi_id === "string" ? account.yenomi_id : null) }));
}

export async function PATCH(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }));

  const parsed = accountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStore(NextResponse.json({ error: "Hesap bilgileri geçersiz." }, { status: 400 }));
  const email = normalizeEmail(parsed.data.email);
  if (validateEmail(email)) return noStore(NextResponse.json({ error: "Geçerli bir e-posta adresi yazın." }, { status: 400 }));

  const currentEmail = normalizeEmail(identity.user.email ?? "");
  const requestedEmailChange = email !== currentEmail;
  const client = getSupabaseUserClient(identity.accessToken);
  const { data, error } = await client.auth.updateUser({
    ...(requestedEmailChange ? { email } : {}),
    data: { name: parsed.data.name },
  });
  if (error || !data.user) return noStore(NextResponse.json({ error: "Hesap bilgileri kaydedilemedi." }, { status: 503 }));

  return noStore(NextResponse.json({
    account: {
      name: parsed.data.name,
      email: requestedEmailChange ? email : data.user.email ?? email,
      pendingEmail: requestedEmailChange,
    },
  }));
}

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }));

  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStore(NextResponse.json({ error: "Şifre geçersiz." }, { status: 400 }));
  const passwordError = validateSignupPassword(parsed.data.password);
  if (passwordError) return noStore(NextResponse.json({ error: passwordError }, { status: 400 }));

  const client = getSupabaseUserClient(identity.accessToken);
  const { error } = await client.auth.updateUser({ password: parsed.data.password });
  if (error) return noStore(NextResponse.json({ error: "Şifre güncellenemedi." }, { status: 503 }));

  return noStore(NextResponse.json({ ok: true }));
}
