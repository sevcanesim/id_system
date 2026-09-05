import { NextResponse } from "next/server";
import { fetchPublicCardByToken } from "../../../lib/repositories/public-profiles";
import { cardVcardPath } from "../../../lib/public-card/urls";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const { data } = await fetchPublicCardByToken(slug);
  if (data?.public_id) return NextResponse.redirect(new URL(cardVcardPath(data.public_id), _request.url), 308);

  return NextResponse.json({ error: "Kartvizit bulunamadı." }, { status: 404 });
}
