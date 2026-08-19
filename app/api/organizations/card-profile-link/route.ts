import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

const schema = z.object({ organizationId: z.string().uuid(), profileId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(bearer);
  if (!data.user) return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz kart eşleştirmesi." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data: member } = await admin.from("organization_members")
    .select("id,status")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", data.user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Bu şirkette aktif üyeliğin yok." }, { status: 403 });

  const { data: profile } = await admin.from("card_profiles")
    .select("id")
    .eq("id", parsed.data.profileId)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Kart profili bulunamadı." }, { status: 404 });

  const { error } = await admin.from("physical_cards")
    .update({ owner_profile_id: parsed.data.profileId })
    .eq("organization_id", parsed.data.organizationId)
    .eq("owner_user_id", data.user.id)
    .is("owner_profile_id", null);
  if (error) return NextResponse.json({ error: "Fiziksel kart profille eşleştirilemedi." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
