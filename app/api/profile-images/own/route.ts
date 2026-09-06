import { NextRequest, NextResponse } from "next/server";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { PROFILE_IMAGE_BUCKET, isProfileImagePathOwnedBy } from "../../../../lib/profile-images";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return new NextResponse(null, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const path = request.nextUrl.searchParams.get("path");
  if (!path || !isProfileImagePathOwnedBy(path, identity.user.id)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage.from(PROFILE_IMAGE_BUCKET).download(path);
  if (error || !data) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return new NextResponse(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": data.type || "image/webp",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
