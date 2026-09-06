import { NextResponse } from "next/server";
import { isCardProfileServiceActive } from "../../../lib/card-profile";
import { fetchPublicCardByToken } from "../../../lib/repositories/public-profiles";
import { cardVcardPath } from "../../../lib/public-card/urls";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const { data } = await fetchPublicCardByToken(slug);
  if (data?.public_id && data.card_status === "ACTIVE" && isCardProfileServiceActive(data)) {
    const response = NextResponse.redirect(new URL(cardVcardPath(data.public_id), _request.url), 307);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  return NextResponse.json({ error: "Kartvizit bulunamadı." }, { status: 404 });
}
