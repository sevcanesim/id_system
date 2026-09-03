import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  INSTANT_CONNECT_SOURCES,
  isInstantConnectProfileEligible,
  type InstantConnectProfile,
} from "../../../../lib/networking/instant-connect";
import { consumeDistributedRateLimit, requestIp } from "../../../../lib/security/rate-limit";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const publicProfileId = z.string().trim().regex(/^[A-Za-z0-9]{8,32}$/);
const sourceSchema = z.enum(INSTANT_CONNECT_SOURCES);
const baseSchema = z.object({
  targetProfileId: z.string().uuid(),
  source: sourceSchema,
  locale: z.enum(["tr", "en"]).default("tr"),
  eventId: z.string().uuid().nullable().optional(),
  eventLinkId: z.string().uuid().nullable().optional(),
});
const accountHandshakeSchema = baseSchema.extend({
  kind: z.literal("ACCOUNT"),
  sourceProfileId: z.string().uuid(),
});
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
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

async function profileByPublicId(publicId: string) {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("card_profiles")
    .select("id,user_id,name,role,company,email,image_url,is_published,card_status,service_expires_at,grace_ends_at,public_id")
    .eq("public_id", publicId)
    .maybeSingle();
  return (data as ProfileCandidate | null) ?? null;
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

    const profile = ((data as ProfileCandidate[] | null) ?? []).find(isInstantConnectProfileEligible);
    if (!profile) return noStore(NextResponse.json({ identity: null }));

    return noStore(NextResponse.json({
      identity: {
        profileId: profile.id,
        name: profile.name,
        role: profile.role,
        company: profile.company,
        imageUrl: profile.image_url,
      },
    }));
  } catch (error) {
    console.error("instant connect identity lookup failed", error instanceof Error ? error.message : "UNKNOWN");
    return noStore(NextResponse.json({ error: "Profiliniz şu anda okunamıyor." }, { status: 503 }));
  }
}

export async function POST(request: NextRequest) {
  const clientIp = requestIp(request.headers);
  const rateLimit = await consumeDistributedRateLimit({
    key: `instant-connect:${clientIp}`,
    limit: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return noStore(NextResponse.json({ code: "HANDSHAKE_FAILED", error: "Çok fazla bağlantı denemesi yapıldı. Lütfen daha sonra tekrar deneyin." }, { status: 429 }));
  }

  const parsed = handshakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return noStore(NextResponse.json({ code: "HANDSHAKE_FAILED", error: "Bağlantı bilgileri geçersiz." }, { status: 400 }));
  }

  try {
    const submission = parsed.data;
    let sourceProfileId: string;

    if (submission.kind === "ACCOUNT") {
      const actor = await authenticate(request);
      if (!actor) return noStore(NextResponse.json({ code: "AUTH_REQUIRED" }, { status: 401 }));
      const admin = getSupabaseAdminClient();
      const { data: sourceProfile } = await admin
        .from("card_profiles")
        .select("id")
        .eq("id", submission.sourceProfileId)
        .eq("user_id", actor.id)
        .maybeSingle();
      if (!sourceProfile) return noStore(NextResponse.json({ code: "SOURCE_PROFILE_NOT_FOUND" }, { status: 403 }));
      sourceProfileId = sourceProfile.id;
    } else {
      const sourceProfile = await profileByPublicId(submission.sourcePublicId);
      if (!sourceProfile) return noStore(NextResponse.json({ code: "SOURCE_PROFILE_NOT_FOUND" }, { status: 404 }));
      sourceProfileId = sourceProfile.id;
    }

    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.rpc("create_yenomi_handshake", {
      p_source_profile_id: sourceProfileId,
      p_target_profile_id: submission.targetProfileId,
      p_source: submission.source,
      p_locale: submission.locale,
      p_event_id: submission.eventId || null,
      p_event_link_id: submission.eventLinkId || null,
    });
    const result = data as { ok?: boolean; created?: boolean; code?: string } | null;
    if (error || !result?.ok) {
      console.error("instant connect handshake failed", error?.message || result?.code || "UNKNOWN");
      return noStore(NextResponse.json({ code: result?.code || "HANDSHAKE_FAILED" }, { status: 409 }));
    }

    return noStore(NextResponse.json({ ok: true, created: Boolean(result.created) }));
  } catch (error) {
    console.error("instant connect route failed", error instanceof Error ? error.message : "UNKNOWN");
    return noStore(NextResponse.json({ code: "HANDSHAKE_FAILED" }, { status: 503 }));
  }
}
