import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveRequestIdentity } from "../../../lib/auth/request-identity";
import { PROFILE_IMAGE_BUCKET, isProfileImagePathOwnedBy, ownProfileImagePath } from "../../../lib/profile-images";
import { profileImageErrorMessage, normalizeProfileImage } from "../../../lib/security/profile-images";
import { getSupabaseAdminClient } from "../../../lib/supabase/server-admin";

export const runtime = "nodejs";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }));

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return noStore(NextResponse.json({ error: "Profil fotoğrafı gerekli." }, { status: 400 }));

  try {
    const normalized = await normalizeProfileImage(new Uint8Array(await file.arrayBuffer()));
    const path = `${identity.user.id}/profile-${randomUUID()}.webp`;
    const admin = getSupabaseAdminClient();
    const { error } = await admin.storage.from(PROFILE_IMAGE_BUCKET).upload(path, normalized.bytes, {
      contentType: normalized.contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) return noStore(NextResponse.json({ error: "Profil fotoğrafı kaydedilemedi." }, { status: 503 }));

    return noStore(NextResponse.json({ path, previewUrl: ownProfileImagePath(path) }, { status: 201 }));
  } catch (error) {
    return noStore(NextResponse.json({ error: profileImageErrorMessage(error) }, { status: 400 }));
  }
}

export async function DELETE(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }));
  const payload = await request.json().catch(() => null) as { path?: unknown } | null;
  const path = typeof payload?.path === "string" ? payload.path : "";
  if (!isProfileImagePathOwnedBy(path, identity.user.id)) {
    return noStore(NextResponse.json({ error: "Görsel bulunamadı." }, { status: 404 }));
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.storage.from(PROFILE_IMAGE_BUCKET).remove([path]);
  if (error) return noStore(NextResponse.json({ error: "Profil fotoğrafı silinemedi." }, { status: 503 }));
  return noStore(NextResponse.json({ ok: true }));
}
