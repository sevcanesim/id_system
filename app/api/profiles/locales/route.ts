import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

const schema = z.object({
  profileId: z.string().uuid(),
  locale: z.literal("en"),
  role: z.string().trim().max(120).nullable(),
  about: z.string().trim().max(280).nullable(),
});

export async function GET(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const profileId = request.nextUrl.searchParams.get("profileId") ?? "";
  if (!z.string().uuid().safeParse(profileId).success) {
    return NextResponse.json({ error: "Kart profili geçersiz." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("card_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", identity.user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Kart profili bulunamadı." }, { status: 404 });

  const { data, error } = await admin
    .from("card_profile_locales")
    .select("locale,role,about")
    .eq("profile_id", profileId)
    .eq("locale", "en")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "İngilizce içerik yüklenemedi." }, { status: 503 });
  return NextResponse.json({ locale: data ?? null });
}

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "İngilizce profil içeriği geçersiz." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("card_profiles")
    .select("id")
    .eq("id", parsed.data.profileId)
    .eq("user_id", identity.user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Kart profili bulunamadı." }, { status: 404 });

  const { error } = await admin.from("card_profile_locales").upsert({
    profile_id: parsed.data.profileId,
    locale: parsed.data.locale,
    role: parsed.data.role,
    about: parsed.data.about,
  });
  if (error) return NextResponse.json({ error: "İngilizce içerik kaydedilemedi." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
