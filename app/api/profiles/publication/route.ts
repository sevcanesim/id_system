import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

const schema = z.object({
  profileId: z.string().uuid(),
  isPublished: z.boolean(),
});

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz yayın durumu." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("card_profiles")
    .update({ is_published: parsed.data.isPublished })
    .eq("id", parsed.data.profileId)
    .eq("user_id", identity.user.id)
    .select("id,is_published")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Kart durumu güncellenemedi." }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Kart profili bulunamadı." }, { status: 404 });
  if (Boolean(profile.is_published) !== parsed.data.isPublished) {
    return NextResponse.json({ error: "Kart durumu doğrulanamadı." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, isPublished: Boolean(profile.is_published) });
}
