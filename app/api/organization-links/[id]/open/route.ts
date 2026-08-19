import { NextRequest, NextResponse } from "next/server";
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
    .select("id,organization_id,link_type,url,file_path,is_published,publish_at")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (!link) return NextResponse.redirect(new URL("/", request.url), 302);
  if (link.publish_at && new Date(link.publish_at).getTime() > Date.now()) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const target = safeTarget(
    link.link_type === "FILE" && link.file_path
      ? admin.storage.from("organization-assets").getPublicUrl(link.file_path)
          .data.publicUrl
      : link.url,
  );
  if (!target) return NextResponse.redirect(new URL("/", request.url), 302);

  const profileId = request.nextUrl.searchParams.get("profileId");
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;
  await admin.from("organization_link_events").insert({
    organization_id: link.organization_id,
    organization_link_id: link.id,
    profile_id: profileId || null,
    event_type: link.link_type === "FILE" ? "DOWNLOAD" : "CLICK",
    country,
  });

  return NextResponse.redirect(target, 302);
}
