import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthClient, getSupabaseUserClient } from "../../../lib/supabase/server-admin";

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  return data.user ? { user: data.user, client: getSupabaseUserClient(token) } : null;
}

export async function GET(request: NextRequest) {
  const auth = await context(request);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const profileId = request.nextUrl.searchParams.get("profileId");
  let query = auth.client.from("physical_cards")
    .select("id,card_code,owner_profile_id,organization_id,status,activated_at,replaced_by_card_id,lost_at,disabled_at")
    .order("created_at", { ascending: true });
  if (profileId) query = query.eq("owner_profile_id", profileId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Fiziksel kartlar yüklenemedi." }, { status: 500 });
  return NextResponse.json({ cards: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await context(request);
  if (!auth) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json().catch(() => null) as { cardId?: string; status?: string } | null;
  if (!body?.cardId || !["ACTIVE", "LOST", "DISABLED"].includes(body.status ?? ""))
    return NextResponse.json({ error: "Geçersiz kart işlemi." }, { status: 400 });
  const { data, error } = await auth.client.rpc("change_physical_card_status", { p_card_id: body.cardId, p_status: body.status });
  if (error) {
    const message = error.message.includes("REPLACED_CARD_CANNOT_BE_REACTIVATED")
      ? "Yerine yeni kart tanımlanmış eski kart yeniden etkinleştirilemez."
      : error.message.includes("ONLY_ORGANIZATION_MANAGER_CAN_DISABLE")
        ? "Kartı yalnızca şirket yöneticisi devre dışı bırakabilir."
        : "Kart durumu güncellenemedi.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return NextResponse.json({ card: data });
}
