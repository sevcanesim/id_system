import { NextRequest, NextResponse } from "next/server";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { getSupabaseUserClient } from "../../../../lib/supabase/server-admin";

const PROFILE_COLUMNS =
  "id,user_id,organization_id,entitlement_id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,bio,is_published,card_status,service_started_at,service_expires_at,grace_ends_at,search_indexing_enabled";

export async function GET(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const client = getSupabaseUserClient(identity.accessToken);
  const { data, error } = await client
    .from("card_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", identity.user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Kart profilleri yüklenemedi." }, { status: 500 });
  return NextResponse.json({ profiles: data ?? [] });
}
