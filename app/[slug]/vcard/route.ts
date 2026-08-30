import { NextResponse } from "next/server";
import { profiles } from "../../data";
import { createVCard, type CardProfileRow } from "../../../lib/card-profile";
import { getPublicSupabaseClient } from "../../../lib/supabase/public";

type RouteContext = { params: Promise<{ slug: string }> };

function safeFileName(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "kartvizit";
}

function demoToRow(slug: string): CardProfileRow | null {
  const profile = profiles[slug];
  if (!profile) return null;
  const external = profile.links.find((link) => link.kind === "external")?.href ?? null;
  const location = profile.links.find((link) => link.kind === "map")?.href ?? null;
  return {
    id: `demo-${slug}`,
    user_id: `demo-${slug}`,
    slug,
    name: profile.name,
    role: profile.role,
    company: null,
    phone: profile.phone ?? null,
    whatsapp: profile.whatsapp ?? null,
    email: profile.email ?? null,
    website: external,
    linkedin: profile.linkedin ?? null,
    instagram: profile.instagram ?? null,
    location,
    image_url: profile.image,
    is_published: true,
    card_status: "ACTIVE",
    service_started_at: null,
    service_expires_at: null,
    grace_ends_at: null
  };
}

function vcardResponse(profile: CardProfileRow) {
  return new NextResponse(createVCard(profile), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFileName(profile.name)}.vcf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const demo = demoToRow(slug);
  if (demo) return vcardResponse(demo);

  const supabase = getPublicSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from("card_profiles")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (data) return vcardResponse(data as CardProfileRow);
  }

  return NextResponse.json({ error: "Kartvizit bulunamadı." }, { status: 404 });
}
