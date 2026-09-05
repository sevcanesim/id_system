import { NextResponse } from "next/server";
import { createVCard, isCardProfileServiceActive } from "../../../../lib/card-profile";
import { fetchPublicCardByToken } from "../../../../lib/repositories/public-profiles";
import { cardVcardPath } from "../../../../lib/public-card/urls";

type RouteContext = { params: Promise<{ publicId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { publicId } = await params;
  const { data: profile } = await fetchPublicCardByToken(publicId);
  if (!profile || !profile.is_published || profile.card_status !== "ACTIVE" || !isCardProfileServiceActive(profile)) return new NextResponse("Bulunamadı", { status: 404 });
  if (profile.public_id && publicId !== profile.public_id) {
    return NextResponse.redirect(new URL(cardVcardPath(profile.public_id), request.url), 308);
  }
  return new NextResponse(createVCard(profile), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="yenomi-${publicId}.vcf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
