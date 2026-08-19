import { NextResponse } from "next/server";
import { getPublicSupabaseClient } from "../../../../lib/supabase/public";
import { createVCard, isCardProfileServiceActive } from "../../../../lib/card-profile";
import { fetchPublicCardByToken } from "../../../../lib/repositories/profiles";

type RouteContext = { params: Promise<{ publicId: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const { publicId } = await params;
  const supabase = getPublicSupabaseClient();
  if (!supabase) return new NextResponse("Bulunamadı", { status: 404 });
  const { data: profile } = await fetchPublicCardByToken(supabase, publicId);
  if (!profile || !profile.is_published || profile.card_status !== "ACTIVE" || !isCardProfileServiceActive(profile)) return new NextResponse("Bulunamadı", { status: 404 });
  return new NextResponse(createVCard(profile), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="yenomi-${publicId}.vcf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
