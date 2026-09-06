import { NextRequest, NextResponse } from "next/server";
import { isCardProfileServiceActive, type CardProfileRow } from "../../../../../lib/card-profile";
import { PROFILE_IMAGE_BUCKET, profileImagePathFromValue } from "../../../../../lib/profile-images";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

export async function GET(_: NextRequest, context: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await context.params;
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(publicId)) return new NextResponse(null, { status: 404 });

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("card_profiles")
    .select("image_url,is_published,card_status,service_expires_at,grace_ends_at")
    .eq("public_id", publicId)
    .maybeSingle();
  const profile = data as Pick<CardProfileRow, "image_url" | "is_published" | "card_status" | "service_expires_at" | "grace_ends_at"> | null;
  if (!profile || !profile.is_published || profile.card_status !== "ACTIVE" || !isCardProfileServiceActive(profile)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const path = profileImagePathFromValue(profile.image_url);
  if (!path) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  const { data: image, error } = await admin.storage.from(PROFILE_IMAGE_BUCKET).download(path);
  if (error || !image) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(image, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
      "Content-Type": image.type || "image/webp",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
