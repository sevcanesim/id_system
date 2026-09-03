import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createOrganizationAssetSignedUrl,
  isOrganizationAssetPubliclyAvailable,
} from "../../../../../lib/organizations/organization-assets";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";

function safeTarget(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = getSupabaseAdminClient();
  const { data: link } = await admin
    .from("organization_links")
    .select("id,organization_id,kind,link_type,url,file_path,is_published,publish_at")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (!link || !isOrganizationAssetPubliclyAvailable(link.is_published, link.publish_at)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // Toplantı Planla yalnız gerçek bir takvim/randevu URL'sine yönlenebilir.
  if (link.kind === "MEETING" && link.link_type === "FILE") {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const fileUrl = link.link_type === "FILE"
    ? await createOrganizationAssetSignedUrl(admin, link.file_path)
    : null;
  const target = safeTarget(link.link_type === "FILE" ? fileUrl : link.url);
  if (!target) return NextResponse.redirect(new URL("/", request.url), 302);

  const requestedProfileId = z.string().uuid().safeParse(request.nextUrl.searchParams.get("profileId"));
  let profileId: string | null = null;
  if (requestedProfileId.success) {
    const { data: profile } = await admin
      .from("card_profiles")
      .select("id")
      .eq("id", requestedProfileId.data)
      .eq("organization_id", link.organization_id)
      .maybeSingle();
    profileId = profile?.id || null;
  }
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;
  await admin.from("organization_link_events").insert({
    organization_id: link.organization_id,
    organization_link_id: link.id,
    profile_id: profileId,
    event_type: link.link_type === "FILE" ? "DOWNLOAD" : "CLICK",
    country,
  });

  return NextResponse.redirect(target, 302);
}
