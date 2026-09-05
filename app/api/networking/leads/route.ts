import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scoreLead } from "../../../../lib/networking/catalog";
import { normalizeContactPhone } from "../../../../lib/networking/contact-phone";
import { queueOrganizationWebhookEvent } from "../../../../lib/organizations/webhook-integrations";
import { consumeDistributedRateLimit, requestIp } from "../../../../lib/security/rate-limit";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const leadSubmissionSchema = z.object({
  profilePublicId: z.string().trim().regex(/^[A-Za-z0-9]{8,32}$/),
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
  const clientIp = requestIp(request.headers);
  const rateLimit = await consumeDistributedRateLimit({
    key: `networking-lead:${clientIp}`,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const parsedSubmission = leadSubmissionSchema.safeParse(requestBody);
  if (!parsedSubmission.success) {
    return NextResponse.json({ error: "Lütfen zorunlu alanları kontrol edin." }, { status: 400 });
  }

  const submission = parsedSubmission.data;
  const normalizedPhone = normalizeContactPhone(submission.phone);
  if (!normalizedPhone.valid) {
    return NextResponse.json({ error: "Telefon numarasını ülke koduyla birlikte geçerli formatta girin." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: cardProfile } = await supabaseAdmin
    .from("card_profiles")
    .select("id,organization_id,user_id,is_published,card_status")
    .eq("public_id", submission.profilePublicId)
    .maybeSingle();

  if (!cardProfile || !cardProfile.is_published || cardProfile.card_status !== "ACTIVE") {
    return NextResponse.json({ error: "Bu kart şu anda lead kabul etmiyor." }, { status: 404 });
  }

  const normalizedEmail = submission.email.toLowerCase();
  const { data: existingLead } = await supabaseAdmin
    .from("networking_leads")
    .select("id")
    .eq("profile_id", cardProfile.id)
    .eq("visitor_id", submission.visitorId)
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingLead) {
    return NextResponse.json({ ok: true, leadId: existingLead.id, duplicate: true });
  }

  const leadEvents = ["QR_SCAN", "CONTACT_SHARED"];
  const leadScore = scoreLead(leadEvents, submission.interests);

  const { data: createdLead, error: insertError } = await supabaseAdmin.from("networking_leads").insert({
    organization_id: cardProfile.organization_id,
    profile_id: cardProfile.id,
    visitor_id: submission.visitorId,
    event_id: submission.eventId || null,
    event_link_id: submission.eventLinkId || null,
    full_name: submission.fullName,
    email: normalizedEmail,
    phone: normalizedPhone.value,
    company: submission.company || null,
    position: submission.position || null,
    city: "Belirtilmedi",
    country: "Belirtilmedi",
    locale: submission.locale,
    interests: submission.interests,
    intent: submission.interests[0] || null,
    introduction: submission.introduction || null,
    source: submission.source,
    status: "NEW",
    score: leadScore,
    ip_hash: clientIp === "unknown" ? null : createHash("sha256").update(clientIp).digest("hex"),
  }).select("id").single();

  if (insertError || !createdLead) {
    console.error("networking lead insert failed");
    return NextResponse.json({ error: "Bilgiler kaydedilemedi." }, { status: 503 });
  }

  await supabaseAdmin.from("networking_lead_events").insert([
    { lead_id: createdLead.id, kind: "QR_SCAN", payload: { source: submission.source } },
    { lead_id: createdLead.id, kind: "CONTACT_SHARED", payload: { email: normalizedEmail } },
  ]);

  await queueOrganizationWebhookEvent(supabaseAdmin, cardProfile.organization_id, "LEAD_CREATED", {
    leadId: createdLead.id,
    fullName: submission.fullName,
    email: normalizedEmail,
    phone: normalizedPhone.value,
    company: submission.company || null,
    position: submission.position || null,
    source: submission.source,
    score: leadScore,
    status: "NEW",
  });

  return NextResponse.json({ ok: true, leadId: createdLead.id });
}
