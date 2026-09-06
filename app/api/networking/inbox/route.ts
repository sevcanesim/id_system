import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isIndividualPremiumPackage } from "../../../../lib/commerce/packages";
import { LEAD_STATUSES, scoreLabel } from "../../../../lib/networking/catalog";
import { countMailSentToday, sendDebitedNetworkFollowUp } from "../../../../lib/networking/follow-up";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const followUpSchema = z.object({
  action: z.literal("send_followup"),
  leadId: z.string().uuid(),
  subject: z.string().trim().min(2).max(180),
  message: z.string().trim().min(2).max(4000),
});

const leadStatusSchema = z.object({
  action: z.literal("update_lead"),
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
});

async function requireUser(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return null;
  return {
    userId: identity.user.id,
    email: identity.user.email ?? null,
    emailConfirmedAt: identity.user.email_confirmed_at ?? null,
  };
}

async function personalProfileIds(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string) {
  const { data } = await admin
    .from("card_profiles")
    .select("id,name")
    .eq("user_id", userId)
    .is("organization_id", null);
  return data ?? [];
}

export async function GET(request: NextRequest) {
  const actor = await requireUser(request);
  if (!actor) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const profiles = await personalProfileIds(admin, actor.userId);
  const profileIds = profiles.map((row) => row.id);
  const [{ data: leads }, { data: meetings }, { data: entitlements }] = await Promise.all([
    profileIds.length
      ? admin.from("networking_leads").select("id,full_name,company,position,city,country,source,status,score,interests,created_at,counterpart:card_profiles!networking_leads_counterpart_profile_id_fkey(public_id,slug)").in("profile_id", profileIds).is("organization_id", null).order("created_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as never[] }),
    profileIds.length
      ? admin.from("networking_meetings").select("*").in("profile_id", profileIds).is("organization_id", null).order("created_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as never[] }),
    admin
      .from("entitlements")
      .select("package_code,network_mail_limit,network_mail_remaining,status,expires_at")
      .eq("user_id", actor.userId)
      .eq("status", "ACTIVE")
      .order("expires_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const leadRows = (leads || []) as Array<{ id: string; score: number }>;
  const leadIds = leadRows.map((lead) => lead.id);
  const { data: timeline } = leadIds.length
    ? await admin.from("networking_lead_events").select("*").in("lead_id", leadIds).order("created_at", { ascending: true })
    : { data: [] };

  const isPremium = isIndividualPremiumPackage(entitlements?.package_code);
  return NextResponse.json({
    leads: leadRows.map((lead) => ({ ...lead, scoreLabel: scoreLabel(lead.score) })),
    meetings: meetings || [],
    events: [],
    eventLinks: [],
    timeline: timeline || [],
    mailCredits: {
      mail_credits_remaining: isPremium ? entitlements?.network_mail_remaining ?? 0 : 0,
      mail_credit_limit: isPremium ? entitlements?.network_mail_limit ?? 0 : 0,
    },
    premium: isPremium,
  });
}

export async function POST(request: NextRequest) {
  const actor = await requireUser(request);
  if (!actor) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const admin = getSupabaseAdminClient();
  const profiles = await personalProfileIds(admin, actor.userId);
  const profileIds = profiles.map((row) => row.id);
  if (!profileIds.length) return NextResponse.json({ error: "Kişisel kart bulunamadı." }, { status: 404 });

  if (body?.action === "send_followup") {
    const parsed = followUpSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Mail talebi geçersiz." }, { status: 400 });
    const { data: lead } = await admin
      .from("networking_leads")
      .select("id,email,full_name,profile_id")
      .eq("id", parsed.data.leadId)
      .is("organization_id", null)
      .maybeSingle();
    if (!lead || !profileIds.includes(lead.profile_id)) {
      return NextResponse.json({ error: "Lead bulunamadı." }, { status: 404 });
    }
    const { data: ownedLeads } = await admin.from("networking_leads").select("id").in("profile_id", profileIds).is("organization_id", null);
    const displayName = profiles.find((row) => row.id === lead.profile_id)?.name?.trim() || "Yenomi ID";
    const result = await sendDebitedNetworkFollowUp({
      admin,
      ledger: { kind: "individual", userId: actor.userId },
      lead: { id: lead.id, email: lead.email, full_name: lead.full_name },
      mail: { subject: parsed.data.subject, message: parsed.data.message },
      sender: { email: actor.email, emailConfirmedAt: actor.emailConfirmedAt },
      displayName,
      sentToday: await countMailSentToday(admin, (ownedLeads || []).map((row) => row.id)),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
    }
    return NextResponse.json({ ok: true, mailCreditsRemaining: result.remaining });
  }

  if (body?.action === "update_lead") {
    const parsed = leadStatusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Lead durumu geçersiz." }, { status: 400 });
    const { data: existing } = await admin
      .from("networking_leads")
      .select("id,profile_id")
      .eq("id", parsed.data.leadId)
      .is("organization_id", null)
      .maybeSingle();
    if (!existing || !profileIds.includes(existing.profile_id)) {
      return NextResponse.json({ error: "Lead bulunamadı." }, { status: 404 });
    }
    const { data: lead, error } = await admin
      .from("networking_leads")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.leadId)
      .select("*")
      .maybeSingle();
    if (error || !lead) return NextResponse.json({ error: "Lead güncellenemedi." }, { status: 503 });
    const leadRow = lead as { score: number };
    return NextResponse.json({ lead: { ...leadRow, scoreLabel: scoreLabel(leadRow.score) } });
  }

  return NextResponse.json({ error: "Bilinmeyen işlem." }, { status: 400 });
}
