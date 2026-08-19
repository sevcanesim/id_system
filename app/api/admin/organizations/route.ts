import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { sendOrganizationInviteEmail } from "../../../../lib/email/resend";
import { publicSiteUrl } from "../../../../lib/payments/config";
import { normalizeCardSlug } from "../../../../lib/validation/slug";

export const runtime = "nodejs";

const provisionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email(),
  ownerFullName: z.string().trim().min(2).max(120),
  planCode: z.enum(["DEMO-2", "DEMO-5", "DEMO-10", "STARTER", "GROWTH", "BUSINESS", "ENTERPRISE"]),
  // Only required when the plan has no fixed seat_limit (ENTERPRISE), but any
  // plan can be overridden for a negotiated deal.
  seatLimitOverride: z.number().int().min(1).max(100000).optional(),
  // Billing cadence only — see supabase/migrations/031_monthly_billing.sql.
  // Neither option auto-renews; termDays sets a fixed expires_at that an
  // admin must manually extend (a real recurring-payment integration is a
  // separate, larger piece of work).
  billingPeriod: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),
  termDays: z.number().int().min(1).max(3650).optional(),
});

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return row ? { user: data.user, admin } : null;
}

// GET: corporate accounts overview for the admin dashboard (org, active
// subscription/plan/seat_limit, seats used). Also returns the sellable plan
// catalog so the provisioning form can populate its plan picker.
export async function GET(request: NextRequest) {
  const ctx = await requireAdmin(request);
  if (!ctx) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });

  const [{ data: organizations, error: orgError }, { data: plans, error: planError }] = await Promise.all([
    ctx.admin
      .from("organizations")
      .select("id,name,slug,status,created_at,organization_subscriptions(id,status,seat_limit,starts_at,expires_at,billing_period,business_plans(code,name)),organization_members(id,role,status)")
      .order("created_at", { ascending: false }),
    ctx.admin.from("business_plans").select("code,name,seat_limit,annual_price_kurus,monthly_price_kurus,is_active").eq("is_active", true).order("annual_price_kurus", { ascending: true, nullsFirst: true }),
  ]);

  if (orgError || planError) return NextResponse.json({ error: "Kurumsal hesaplar yüklenemedi." }, { status: 500 });

  const accounts = (organizations || []).map((org) => {
    const activeSubscription = (org.organization_subscriptions || []).find((s: { status: string }) => ["ACTIVE", "GRACE_PERIOD"].includes(s.status));
    const usedSeats = (org.organization_members || []).filter((m: { status: string }) => ["ACTIVE", "INVITED"].includes(m.status)).length;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      createdAt: org.created_at,
      subscription: activeSubscription || null,
      usedSeats,
      memberCount: (org.organization_members || []).length,
    };
  });

  return NextResponse.json({ accounts, plans: plans || [] });
}

// POST: provisions a brand-new corporate customer. This is the only code
// path that creates the initial organization_subscriptions.seat_limit for a
// paying company — see supabase/migrations/029_organization_provisioning.sql.
export async function POST(request: NextRequest) {
  const ctx = await requireAdmin(request);
  if (!ctx) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });

  const parsed = provisionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz bilgi." }, { status: 400 });
  const body = parsed.data;

  const baseSlug = normalizeCardSlug(body.name) || "sirket";
  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const inviteExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  // Default term matches the billing cadence when the admin doesn't override
  // it: 30 days for a monthly plan, 365 for an annual one.
  const termDays = body.termDays ?? (body.billingPeriod === "MONTHLY" ? 30 : 365);
  const subscriptionExpiresAt = new Date(Date.now() + termDays * 86400000).toISOString();

  // Slug collisions are rare (organization names differ) but handled by
  // retrying with a short random suffix rather than failing the whole
  // provisioning request on a cosmetic collision.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: result, error } = await ctx.admin.rpc("provision_organization", {
      p_actor_user_id: ctx.user.id,
      p_name: body.name,
      p_slug: slug,
      p_owner_email: body.ownerEmail,
      p_owner_full_name: body.ownerFullName,
      p_plan_code: body.planCode,
      p_seat_limit_override: body.seatLimitOverride ?? null,
      p_billing_period: body.billingPeriod,
      p_expires_at: subscriptionExpiresAt,
      p_token_hash: tokenHash,
      p_invite_expires_at: inviteExpiresAt,
    });

    if (error) {
      console.error("provision_organization rpc error", error);
      return NextResponse.json({ error: "Kurumsal hesap oluşturulamadı." }, { status: 500 });
    }

    const payload = result as { ok?: boolean; code?: string; organization?: { id: string; name: string; slug: string }; member?: { email: string } } | null;
    if (payload?.ok && payload.organization && payload.member) {
      const inviteUrl = `${publicSiteUrl}/kurumsal/davet?token=${raw}`;
      try {
        await sendOrganizationInviteEmail({ to: payload.member.email, inviteUrl, organizationName: payload.organization.name });
      } catch (emailError) {
        // Provisioning already succeeded (organization + subscription +
        // seats exist); a failed email must not roll that back. The admin
        // can resend the invite from the members panel once the owner
        // accepts, or the panel surfaces this so it can be retried by hand.
        console.error("owner invite email failed after successful provisioning", emailError);
        return NextResponse.json({ organization: payload.organization, emailSent: false });
      }
      return NextResponse.json({ organization: payload.organization, emailSent: true });
    }

    if (payload?.code === "DUPLICATE_SLUG_OR_MEMBER" && attempt < 2) continue;

    const messages: Record<string, string> = {
      INVALID_INPUT: "Şirket adı veya bağlantı geçersiz.",
      INVALID_BILLING_PERIOD: "Geçersiz faturalama dönemi.",
      PLAN_NOT_FOUND: "Seçilen paket bulunamadı veya pasif.",
      SEAT_LIMIT_REQUIRED: "Bu paket için sabit bir koltuk sayısı yok; özel bir koltuk sayısı belirtmelisin.",
      MONTHLY_NOT_AVAILABLE_FOR_PLAN: "Bu paket için aylık faturalama seçeneği yok; yıllık seç veya Enterprise için özel teklif iste.",
      DUPLICATE_SLUG_OR_MEMBER: "Bu şirket adı veya sahip e-postası zaten kullanılıyor.",
    };
    return NextResponse.json({ error: messages[payload?.code || ""] || "Kurumsal hesap oluşturulamadı." }, { status: 409 });
  }

  return NextResponse.json({ error: "Kurumsal hesap oluşturulamadı." }, { status: 500 });
}
