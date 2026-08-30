import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scoreLead } from "../../../../lib/networking/catalog";
import { consumeDistributedRateLimit, requestIp } from "../../../../lib/security/rate-limit";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const schema = z.object({
  profileId: z.string().uuid(),
  visitorId: z.string().min(8).max(80),
  eventId: z.string().uuid().optional(),
  eventLinkId: z.string().uuid().optional(),
  source: z.enum(["QR", "NFC", "EVENT", "SHARE"]).default("QR"),
  locale: z.enum(["tr", "en"]).default("tr"),
  requestMeeting: z.literal(false).optional().default(false),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  company: z.string().trim().max(160).optional().default(""),
  position: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  interests: z.array(z.string().trim().max(80)).max(12).optional().default([]),
  introduction: z.string().trim().max(1000).optional().default(""),
});

export async function POST(request: NextRequest) {
  const ip = requestIp(request.headers);
  const limit = await consumeDistributedRateLimit({ key: `networking-lead:${ip}`, limit: 8, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Lütfen zorunlu alanları kontrol edin." }, { status: 400 });
  const body = parsed.data;
  const admin = getSupabaseAdminClient();

  const { data: profile } = await admin
    .from("card_profiles")
    .select("id,organization_id,user_id,is_published,card_status")
    .eq("id", body.profileId)
    .maybeSingle();
  if (!profile || !profile.is_published || profile.card_status !== "ACTIVE") {
    return NextResponse.json({ error: "Bu kart şu anda lead kabul etmiyor." }, { status: 404 });
  }

  const normalizedEmail = body.email.toLowerCase();
  const { data: existing } = await admin
    .from("networking_leads")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("visitor_id", body.visitorId)
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, leadId: existing.id, duplicate: true });
  }

  const events = ["QR_SCAN", "CONTACT_SHARED"];
  const score = scoreLead(events, body.interests);

  const { data: lead, error } = await admin.from("networking_leads").insert({
    organization_id: profile.organization_id,
    profile_id: profile.id,
    visitor_id: body.visitorId,
    event_id: body.eventId || null,
    event_link_id: body.eventLinkId || null,
    full_name: body.fullName,
    email: normalizedEmail,
    phone: body.phone || null,
    company: body.company || null,
    position: body.position || null,
    city: "Belirtilmedi",
    country: "Belirtilmedi",
    locale: body.locale,
    interests: body.interests,
    intent: body.interests[0] || null,
    introduction: body.introduction || null,
    source: body.source,
    status: "NEW",
    score,
    ip_hash: ip === "unknown" ? null : createHash("sha256").update(ip).digest("hex"),
  }).select("id").single();

  if (error || !lead) {
    console.error("networking lead insert failed", error);
    return NextResponse.json({ error: "Bilgiler kaydedilemedi." }, { status: 503 });
  }

  await admin.from("networking_lead_events").insert([
    { lead_id: lead.id, kind: "QR_SCAN", payload: { source: body.source } },
    { lead_id: lead.id, kind: "CONTACT_SHARED", payload: { email: normalizedEmail } },
  ]);

  return NextResponse.json({ ok: true, leadId: lead.id });
}
