import { assertNetworkDailyCap, debitNetworkMail } from "../../../../lib/commerce/packages";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganizationRole } from "../../../../lib/organizations/authorization";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { LEAD_STATUSES, scoreLabel } from "../../../../lib/networking/catalog";
import { sendNetworkingFollowUpEmail } from "../../../../lib/email/resend";
import { createOpaquePublicId } from "../../../../lib/public-card/urls";

export const runtime = "nodejs";

const createEventSchema = z.object({
  action: z.literal("create_event"),
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  location: z.string().trim().max(160).optional().default(""),
  booth: z.string().trim().max(80).optional().default(""),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

const createLinkSchema = z.object({
  action: z.literal("create_event_link"),
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
  profileId: z.string().uuid(),
});

const FOLLOWUP_TEMPLATES = [
  "EVENT_BEFORE",
  "EVENT_MET",
  "OFFER",
  "AFTER_MEETING",
  "PRESENTATION",
  "EVENT_THANKS",
  "PRODUCT_INFO",
  "CUSTOM",
] as const;

const followUpSchema = z.object({
  action: z.literal("send_followup"),
  organizationId: z.string().uuid(),
  leadId: z.string().uuid(),
  template: z.enum(FOLLOWUP_TEMPLATES).default("EVENT_MET"),
});

const meetingSchema = z.object({
  action: z.literal("update_meeting"),
  organizationId: z.string().uuid(),
  meetingId: z.string().uuid(),
  status: z.enum(["ACCEPTED", "ALTERNATIVE", "DECLINED", "COMPLETED"]),
  alternativeAt: z.string().optional(),
});

const leadStatusSchema = z.object({
  action: z.literal("update_lead"),
  organizationId: z.string().uuid(),
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
});

async function requireManager(request: NextRequest, organizationId: string) {
  return requireOrganizationRole(request, organizationId, ["OWNER", "ADMIN"]);
}

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });
  const actor = await requireManager(request, organizationId);
  if (!actor) return NextResponse.json({ error: "Bu alan yalnız şirket yöneticilerine açıktır." }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const [{ data: leads }, { data: events }, { data: meetings }, { data: entitlements }] = await Promise.all([
    admin.from("networking_leads").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
    admin.from("networking_events").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50),
    admin.from("networking_meetings").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
    admin.from("organization_entitlements").select("mail_credits_remaining,mail_credit_limit").eq("organization_id", organizationId).maybeSingle(),
  ]);

  const eventRows = (events || []) as Array<{ id: string }>;
  const leadRows = (leads || []) as Array<{ id: string; score: number }>;
  const eventIds = eventRows.map((event) => event.id);
  const { data: links } = eventIds.length
    ? await admin.from("networking_event_links").select("*").in("event_id", eventIds)
    : { data: [] };
  const leadIds = leadRows.map((lead) => lead.id);
  const { data: timeline } = leadIds.length
    ? await admin.from("networking_lead_events").select("*").in("lead_id", leadIds).order("created_at", { ascending: true })
    : { data: [] };

  return NextResponse.json({
    leads: leadRows.map((lead) => ({ ...lead, scoreLabel: scoreLabel(lead.score) })),
    events: events || [],
    eventLinks: links || [],
    meetings: meetings || [],
    timeline: timeline || [],
    mailCredits: entitlements || { mail_credits_remaining: 0, mail_credit_limit: 0 },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;
  if (action === "create_event") {
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Etkinlik bilgilerini kontrol edin." }, { status: 400 });
    const actor = await requireManager(request, parsed.data.organizationId);
    if (!actor) return NextResponse.json({ error: "Bu alan yalnız şirket yöneticilerine açıktır." }, { status: 403 });
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.from("networking_events").insert({
      organization_id: parsed.data.organizationId,
      public_id: createOpaquePublicId(),
      name: parsed.data.name,
      location: parsed.data.location || null,
      booth: parsed.data.booth || null,
      starts_at: parsed.data.startsAt ? new Date(parsed.data.startsAt).toISOString() : null,
      ends_at: parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null,
    }).select("*").single();
    if (error || !data) return NextResponse.json({ error: "Etkinlik oluşturulamadı." }, { status: 503 });
    return NextResponse.json({ event: data });
  }

  if (action === "create_event_link") {
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Etkinlik QR bilgilerini kontrol edin." }, { status: 400 });
    const actor = await requireManager(request, parsed.data.organizationId);
    if (!actor) return NextResponse.json({ error: "Bu alan yalnız şirket yöneticilerine açıktır." }, { status: 403 });
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin.from("card_profiles").select("id,organization_id").eq("id", parsed.data.profileId).maybeSingle();
    if (!profile || profile.organization_id !== parsed.data.organizationId) {
      return NextResponse.json({ error: "Kart bu şirkete ait değil." }, { status: 409 });
    }
    const { data, error } = await admin.from("networking_event_links").insert({
      event_id: parsed.data.eventId,
      organization_id: parsed.data.organizationId,
      profile_id: parsed.data.profileId,
      public_id: createOpaquePublicId(),
    }).select("*").single();
    if (error || !data) return NextResponse.json({ error: "Etkinlik QR’si oluşturulamadı." }, { status: 503 });
    return NextResponse.json({ link: data });
  }

  if (action === "send_followup") {
    const parsed = followUpSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Mail talebi geçersiz." }, { status: 400 });
    const actor = await requireManager(request, parsed.data.organizationId);
    if (!actor) return NextResponse.json({ error: "Bu alan yalnız şirket yöneticilerine açıktır." }, { status: 403 });
    const admin = getSupabaseAdminClient();
    const { data: lead } = await admin.from("networking_leads").select("*").eq("id", parsed.data.leadId).eq("organization_id", parsed.data.organizationId).maybeSingle();
    if (!lead) return NextResponse.json({ error: "Lead bulunamadı." }, { status: 404 });
    const { data: entitlements } = await admin
      .from("organization_entitlements")
      .select("mail_credits_remaining")
      .eq("organization_id", parsed.data.organizationId)
      .maybeSingle();
    const debit = debitNetworkMail({
      remaining: entitlements?.mail_credits_remaining ?? 0,
      recipientCount: 1,
      kind: "NETWORK",
    });
    if (!debit.ok) {
      return NextResponse.json({ error: "Network Mail kredisi kalmadı. İstek kredi düşmez." }, { status: 409 });
    }
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { data: orgLeads } = await admin
      .from("networking_leads")
      .select("id")
      .eq("organization_id", parsed.data.organizationId);
    const leadIds = (orgLeads || []).map((row: { id: string }) => row.id);
    const { count: sentToday } = leadIds.length
      ? await admin
          .from("networking_lead_events")
          .select("id", { count: "exact", head: true })
          .eq("kind", "MAIL_SENT")
          .in("lead_id", leadIds)
          .gte("created_at", dayStart.toISOString())
      : { count: 0 };
    if (!assertNetworkDailyCap(sentToday ?? 0, 1)) {
      return NextResponse.json({ error: "Günlük Network Mail limiti doldu. İstek kredi düşmez." }, { status: 429 });
    }
    const { data: org } = await admin.from("organizations").select("name").eq("id", parsed.data.organizationId).maybeSingle();
    const sent = await sendNetworkingFollowUpEmail({
      to: lead.email,
      organizationName: org?.name || "Yenomi",
      leadName: lead.full_name,
      template: parsed.data.template,
    });
    if (!sent.sent) {
      const message = sent.reason === "RESEND_API_KEY_MISSING"
        ? "Tanıtım maili gönderilemedi: e-posta servisi yapılandırılmamış. Kredi düşülmedi."
        : "Tanıtım maili gönderilemedi. Kredi düşülmedi.";
      return NextResponse.json({ error: message, reason: sent.reason }, { status: 503 });
    }
    const nextCredits = debit.remaining;
    const { data: credited, error: creditError } = await admin
      .from("organization_entitlements")
      .update({ mail_credits_remaining: nextCredits, updated_at: new Date().toISOString() })
      .eq("organization_id", parsed.data.organizationId)
      .eq("mail_credits_remaining", debit.remaining + debit.debit)
      .select("mail_credits_remaining")
      .maybeSingle();
    if (creditError || !credited) {
      return NextResponse.json({ error: "Mail gönderildi; kredi düşümü doğrulanamadı." }, { status: 503 });
    }
    await admin.from("networking_leads").update({ status: "MAIL_SENT", updated_at: new Date().toISOString() }).eq("id", lead.id);
    await admin.from("networking_lead_events").insert({
      lead_id: lead.id,
      kind: "MAIL_SENT",
      payload: { template: parsed.data.template, credited: true, ledger: "NETWORK", debit: debit.debit },
    });
    return NextResponse.json({ ok: true, mailCreditsRemaining: credited.mail_credits_remaining });
  }

  if (action === "update_meeting") {
    const parsed = meetingSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Görüşme durumu geçersiz." }, { status: 400 });
    const actor = await requireManager(request, parsed.data.organizationId);
    if (!actor) return NextResponse.json({ error: "Bu alan yalnız şirket yöneticilerine açıktır." }, { status: 403 });
    const admin = getSupabaseAdminClient();
    const patch: Record<string, unknown> = {
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.status === "ALTERNATIVE" && parsed.data.alternativeAt) {
      patch.preferred_at = new Date(parsed.data.alternativeAt).toISOString();
    }
    const { data: meeting, error } = await admin
      .from("networking_meetings")
      .update(patch)
      .eq("id", parsed.data.meetingId)
      .eq("organization_id", parsed.data.organizationId)
      .select("*")
      .maybeSingle();
    if (error || !meeting) return NextResponse.json({ error: "Görüşme güncellenemedi." }, { status: 503 });
    const meetingRow = meeting as { id: string; lead_id: string };
    const leadStatus = parsed.data.status === "ACCEPTED" ? "MEETING_SCHEDULED" : parsed.data.status === "DECLINED" ? "CLOSED" : "MEETING_REQUESTED";
    await admin.from("networking_leads").update({ status: leadStatus, updated_at: new Date().toISOString() }).eq("id", meetingRow.lead_id);
    await admin.from("networking_lead_events").insert({
      lead_id: meetingRow.lead_id,
      kind: `MEETING_${parsed.data.status}`,
      payload: { meetingId: meetingRow.id },
    });
    return NextResponse.json({ meeting: meetingRow });
  }

  if (action === "update_lead") {
    const parsed = leadStatusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Lead durumu geçersiz." }, { status: 400 });
    const actor = await requireManager(request, parsed.data.organizationId);
    if (!actor) return NextResponse.json({ error: "Bu alan yalnız şirket yöneticilerine açıktır." }, { status: 403 });
    const admin = getSupabaseAdminClient();
    const { data: lead, error } = await admin
      .from("networking_leads")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.leadId)
      .eq("organization_id", parsed.data.organizationId)
      .select("*")
      .maybeSingle();
    if (error || !lead) return NextResponse.json({ error: "Lead güncellenemedi." }, { status: 503 });
    const leadRow = lead as { score: number };
    return NextResponse.json({ lead: { ...leadRow, scoreLabel: scoreLabel(leadRow.score) } });
  }

  return NextResponse.json({ error: "Bilinmeyen işlem." }, { status: 400 });
}
