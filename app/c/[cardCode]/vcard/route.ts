import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { createVCard, isCardProfileServiceActive, type CardProfileRow } from "../../../../lib/card-profile";

type RouteContext = { params: Promise<{ cardCode: string }> };
type CardRow = { status: "UNASSIGNED" | "ACTIVE" | "LOST" | "DISABLED"; owner_profile_id: string | null };

export async function GET(_: Request, { params }: RouteContext) {
  const { cardCode } = await params;
  if (!/^YN-[A-Z0-9]{12}$/i.test(cardCode)) return new NextResponse("Bulunamadı", { status: 404 });

  const admin = getSupabaseAdminClient();
  const normalizedCode = cardCode.toUpperCase();
  const { data: rawCard } = await admin
    .from("physical_cards")
    .select("status,owner_profile_id")
    .eq("card_code", normalizedCode)
    .maybeSingle();
  const card = rawCard as CardRow | null;
  if (!card || card.status !== "ACTIVE" || !card.owner_profile_id) return new NextResponse("Bulunamadı", { status: 404 });

  const { data: rawProfile } = await admin
    .from("card_profiles")
    .select("id,user_id,entitlement_id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,bio,is_published,card_status,service_started_at,service_expires_at,grace_ends_at")
    .eq("id", card.owner_profile_id)
    .maybeSingle();
  const profile = rawProfile as CardProfileRow | null;

  if (!profile || !profile.is_published || profile.card_status !== "ACTIVE" || !isCardProfileServiceActive(profile)) {
    return new NextResponse("Bulunamadı", { status: 404 });
  }

  return new NextResponse(createVCard(profile), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="yenomi-${normalizedCode}.vcf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
