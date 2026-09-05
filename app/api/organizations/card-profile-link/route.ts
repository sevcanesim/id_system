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
  const { data: result, error } = await admin.rpc("link_own_corporate_card_profile", {
    p_actor_user_id: data.user.id,
    p_organization_id: parsed.data.organizationId,
    p_profile_id: parsed.data.profileId,
  });
  const outcome = result as { ok?: boolean; code?: string; linked_cards?: number } | null;

  if (error || !outcome?.ok) {
    if (outcome?.code === "FORBIDDEN") return NextResponse.json({ error: "Bu şirkette aktif üyeliğin yok." }, { status: 403 });
    if (outcome?.code === "PROFILE_ORGANIZATION_MISMATCH") {
      return NextResponse.json({ error: "Bu profil seçilen şirkete ait değil." }, { status: 409 });
    }
    if (outcome?.code === "PROFILE_NOT_FOUND") return NextResponse.json({ error: "Kart profili bulunamadı." }, { status: 404 });
    if (outcome?.code === "NO_UNLINKED_CARD") {
      return NextResponse.json({ error: "Bu hesap için eşleştirilecek kurumsal fiziksel kart bulunamadı." }, { status: 409 });
    }
    return NextResponse.json({ error: "Fiziksel kart profille eşleştirilemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, linkedCards: outcome.linked_cards ?? 0 });
}
