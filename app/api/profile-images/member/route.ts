import { NextRequest, NextResponse } from "next/server";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { isManagementRole, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { PROFILE_IMAGE_BUCKET, profileImagePathFromValue } from "../../../../lib/profile-images";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return new NextResponse(null, { status: 401, headers: noStoreHeaders });

  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!organizationId || !profileId) return new NextResponse(null, { status: 400, headers: noStoreHeaders });

  const admin = getSupabaseAdminClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", identity.user.id)
    .maybeSingle();
  if (!membership || membership.status !== "ACTIVE" || !isOrganizationRole(membership.role) || !isManagementRole(membership.role)) {
    return new NextResponse(null, { status: 403, headers: noStoreHeaders });
  }

  const { data: profile } = await admin
    .from("card_profiles")
    .select("image_url")
    .eq("id", profileId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  const path = profileImagePathFromValue(profile?.image_url);
  if (!path) return new NextResponse(null, { status: 404, headers: noStoreHeaders });

  const { data: image, error } = await admin.storage.from(PROFILE_IMAGE_BUCKET).download(path);
  if (error || !image) return new NextResponse(null, { status: 404, headers: noStoreHeaders });
  return new NextResponse(image, {
    headers: {
      ...noStoreHeaders,
      "Content-Type": image.type || "image/webp",
    },
  });
}
