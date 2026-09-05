import { NextResponse } from "next/server";
import { getPublicSupabaseClient } from "../../../lib/supabase/public";
import { fetchPublicCardByToken } from "../../../lib/repositories/profiles";
import { cardVcardPath } from "../../../lib/public-card/urls";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const supabase = getPublicSupabaseClient();
  if (supabase) {
    const { data } = await fetchPublicCardByToken(supabase, slug);
    if (data?.public_id) return NextResponse.redirect(new URL(cardVcardPath(data.public_id), _request.url), 308);
  }

  return NextResponse.json({ error: "Kartvizit bulunamadı." }, { status: 404 });
}
