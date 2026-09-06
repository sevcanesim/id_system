import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  INSTANT_CONNECT_SOURCES,
  isInstantConnectProfileEligible,
  type InstantConnectProfile,
} from "../../../../lib/networking/instant-connect";
import { consumeDistributedRateLimit, requestIp } from "../../../../lib/security/rate-limit";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { profileImagePathFromValue, publicProfileImagePath } from "../../../../lib/profile-images";
import { recordSystemError } from "../../../../lib/observability/system-errors";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";

export const runtime = "nodejs";

const publicProfileId = z.string().trim().regex(/^[A-Za-z0-9]{8,32}$/);
const sourceSchema = z.enum(INSTANT_CONNECT_SOURCES);
const baseSchema = z.object({
  targetPublicId: publicProfileId,
  source: sourceSchema,
  locale: z.enum(["tr", "en"]).default("tr"),
  eventId: z.string().uuid().nullable().optional(),
  eventLinkId: z.string().uuid().nullable().optional(),
});
const accountHandshakeSchema = baseSchema.extend({ kind: z.literal("ACCOUNT") });
const qrHandshakeSchema = baseSchema.extend({
  kind: z.literal("QR"),
  sourcePublicId: publicProfileId,
});
const handshakeSchema = z.discriminatedUnion("kind", [accountHandshakeSchema, qrHandshakeSchema]);

type ProfileCandidate = InstantConnectProfile & { public_id: string | null };

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

async function authenticate(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  return identity ? { id: identity.user.id } : null;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await authenticate(request);
    if (!actor) return noStore(NextResponse.json({ identity: null }));

    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("card_profiles")
      .select("id,user_id,name,role,company,email,image_url,is_published,card_status,service_expires_at,grace_ends_at,public_id")
      .eq("user_id", actor.id)
      .order("created_at", { ascending: true });
    if (error) return noStore(NextResponse.json({ error: "Profiliniz şu anda okunamıyor." }, { status: 503 }));

    const profile = ((data as ProfileCandidate[] | null) ?? []).find(
      (candidate) => Boolean(candidate.public_id) && isInstantConnectProfileEligible(candidate),
    );
    if (!profile?.public_id) return noStore(NextResponse.json({ identity: null }));

    return noStore(NextResponse.json({
      identity: {
        publicId: profile.public_id,
        name: profile.name,
        role: profile.role,
        company: profile.company,
        imageUrl: profileImagePathFromValue(profile.image_url) ? publicProfileImagePath(profile.public_id) : null,
      },
    }));
  } catch {
    void recordSystemError({
      source: "INSTANT_CONNECT",
      errorCode: "IDENTITY_LOOKUP_FAILED",
      message: "Instant Connect profil kimliği yüklenemedi.",
    });
    return noStore(NextResponse.json({ error: "Profiliniz şu anda okunamıyor." }, { status: 503 }));
  }
}

export async function POST(request: NextRequest) {
  const clientIp = requestIp(request.headers);
  const rateLimit = await consumeDistributedRateLimit({
    key: `instant-connect:${clientIp}`,
    limit: 12,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!rateLimit.allowed) {
    return noStore(NextResponse.json({ code: "HANDSHAKE_FAILED", error: "Bağlantı doğrulaması şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin." }, { status: rateLimit.unavailable ? 503 : 429 }));
  }

  const parsed = handshakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return noStore(NextResponse.json({ code: "HANDSHAKE_FAILED", error: "Bağlantı bilgileri geçersiz." }, { status: 400 }));
  }

  try {
    const submission = parsed.data;
    const actor = await authenticate(request);
    if (!actor) return noStore(NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 }));
    let sourceProfileId: string;
    const admin = getSupabaseAdminClient();

    if (submission.kind === "ACCOUNT") {
      const { data: sourceProfiles } = await admin
        .from("card_profiles")
        .select("id,user_id,name,role,company,email,image_url,is_published,card_status,service_expires_at,grace_ends_at,public_id")
        .eq("user_id", actor.id)
        .order("created_at", { ascending: true });
      const sourceProfile = ((sourceProfiles as ProfileCandidate[] | null) ?? []).find(isInstantConnectProfileEligible);
      if (!sourceProfile) return noStore(NextResponse.json({ code: "SOURCE_PROFILE_NOT_FOUND" }, { status: 403 }));
      sourceProfileId = sourceProfile.id;
    } else {
      // A QR can identify the visitor's own source profile, but never grants
      // unauthenticated authority to create a connection for somebody else.
      const { data: sourceProfile } = await admin
        .from("card_profiles")
        .select("id")
        .eq("public_id", submission.sourcePublicId)
        .eq("user_id", actor.id)
        .maybeSingle();
      if (!sourceProfile) return noStore(NextResponse.json({ code: "SOURCE_PROFILE_NOT_FOUND" }, { status: 403 }));
      sourceProfileId = sourceProfile.id;
    }

    const { data: targetProfile } = await admin
      .from("card_profiles")
      .select("id,user_id,name,role,company,email,image_url,is_published,card_status,service_expires_at,grace_ends_at,public_id")
      .eq("public_id", submission.targetPublicId)
      .maybeSingle();
    if (!targetProfile || !isInstantConnectProfileEligible(targetProfile as ProfileCandidate)) {
      return noStore(NextResponse.json({ code: "TARGET_PROFILE_NOT_FOUND" }, { status: 404 }));
    }

    const { data, error } = await admin.rpc("create_yenomi_handshake", {
      p_source_profile_id: sourceProfileId,
      p_target_profile_id: targetProfile.id,
      p_source: submission.source,
      p_locale: submission.locale,
      p_event_id: submission.eventId || null,
      p_event_link_id: submission.eventLinkId || null,
    });
    const result = data as { ok?: boolean; created?: boolean; code?: string } | null;
    if (error || !result?.ok) {
      void recordSystemError({
        source: "INSTANT_CONNECT",
        errorCode: "HANDSHAKE_REJECTED",
        message: "Instant Connect bağlantı isteği tamamlanamadı.",
        userId: actor.id,
      });
      return noStore(NextResponse.json({ code: result?.code || "HANDSHAKE_FAILED" }, { status: 409 }));
    }

    return noStore(NextResponse.json({ ok: true, created: Boolean(result.created) }));
  } catch {
    void recordSystemError({
      source: "INSTANT_CONNECT",
      errorCode: "REQUEST_FAILED",
      message: "Instant Connect bağlantı isteği işlenemedi.",
    });
    return noStore(NextResponse.json({ code: "HANDSHAKE_FAILED" }, { status: 503 }));
  }
}
