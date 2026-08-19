import { ADMIN_PROVISION_PLAN_CODES, defaultMailCreditLimit } from "../../../../lib/commerce/packages";
import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { sendOrganizationInviteEmail } from "../../../../lib/email/resend";
import { publicSiteUrl } from "../../../../lib/payments/config";
import { normalizeCardSlug } from "../../../../lib/validation/slug";

export const runtime = "nodejs";

const tenantSchema = z.object({
  action: z.literal("create_tenant"),
  name: z.string().trim().min(2).max(120),
  taxNumber: z.string().trim().min(8).max(32),
  taxOffice: z.string().trim().max(120).optional().default(""),
  legalAddress: z.string().trim().max(240).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  district: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default("Türkiye"),
  planCode: z.enum(ADMIN_PROVISION_PLAN_CODES),
  employeeLimit: z.number().int().min(1).max(100000).optional(),
  digitalCardLimit: z.number().int().min(0).max(100000).optional(),
  physicalCardLimit: z.number().int().min(0).max(100000).optional(),
  mailCreditLimit: z.number().int().min(0).max(1000000).optional(),
  billingPeriod: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),
  termDays: z.number().int().min(1).max(3650).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

const attachSchema = z.object({
  action: z.literal("attach_manager"),
  organizationId: z.string().uuid(),
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["OWNER", "ADMIN", "HR"]),
});

const statusSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

const provisionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email(),
  ownerFullName: z.string().trim().min(2).max(120),
  planCode: z.enum(ADMIN_PROVISION_PLAN_CODES),
  seatLimitOverride: z.number().int().min(1).max(100000).optional(),
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
      .select("id,name,slug,status,created_at,corporate_id,tax_number,organization_entitlements(employee_limit,digital_card_limit,physical_card_limit,mail_credit_limit,mail_credits_remaining,storage_bytes),organization_subscriptions(id,status,seat_limit,starts_at,expires_at,billing_period,business_plans(code,name)),organization_members(id,role,status,email)")
      .order("created_at", { ascending: false }),
    ctx.admin.from("business_plans").select("code,name,seat_limit,annual_price_kurus,monthly_price_kurus,is_active").eq("is_active", true).order("annual_price_kurus", { ascending: true, nullsFirst: true }),
  ]);

  if (orgError || planError) return NextResponse.json({ error: "Kurumsal hesaplar yüklenemedi." }, { status: 500 });

  const accounts = (organizations || []).map((org) => {
    const activeSubscription = (org.organization_subscriptions || []).find((s: { status: string }) => ["ACTIVE", "GRACE_PERIOD"].includes(s.status));
    const usedSeats = (org.organization_members || []).filter((m: { status: string }) => ["ACTIVE", "INVITED"].includes(m.status)).length;
    const entitlements = Array.isArray(org.organization_entitlements) ? org.organization_entitlements[0] : org.organization_entitlements;
    const managers = (org.organization_members || []).filter((member: { role: string; status: string }) => ["OWNER", "ADMIN", "HR"].includes(member.role) && ["ACTIVE", "INVITED"].includes(member.status));
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      corporateId: org.corporate_id || null,
      taxNumber: org.tax_number || null,
      createdAt: org.created_at,
      subscription: activeSubscription || null,
      entitlements: entitlements || null,
      usedSeats,
      memberCount: (org.organization_members || []).length,
      managers,
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
  const incoming = await request.json().catch(() => null);

  if (incoming?.action === "create_tenant") {
    const parsed = tenantSchema.safeParse(incoming);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz şirket bilgisi." }, { status: 400 });
    const body = parsed.data;
    const selectedPlan = (await ctx.admin.from("business_plans").select("seat_limit").eq("code", body.planCode).eq("is_active", true).maybeSingle()).data;
    const employeeLimit = body.employeeLimit ?? selectedPlan?.seat_limit ?? 0;
    if (!employeeLimit) return NextResponse.json({ error: "Bu paket için çalışan limiti belirtmelisin." }, { status: 400 });
    const termDays = body.termDays ?? (body.billingPeriod === "MONTHLY" ? 30 : 365);
    const expiresAt = new Date(Date.now() + termDays * 86400000).toISOString();
    const baseSlug = normalizeCardSlug(body.name) || "sirket";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: result, error } = await ctx.admin.rpc("create_organization_tenant", {
        p_actor_user_id: ctx.user.id,
        p_name: body.name,
        p_slug: slug,
        p_tax_number: body.taxNumber,
        p_tax_office: body.taxOffice,
        p_legal_address: body.legalAddress,
        p_city: body.city,
        p_district: body.district,
        p_country: body.country,
        p_employee_limit: employeeLimit,
        p_digital_card_limit: body.digitalCardLimit ?? employeeLimit,
        p_physical_card_limit: body.physicalCardLimit ?? employeeLimit,
        p_mail_credit_limit: body.mailCreditLimit ?? defaultMailCreditLimit(employeeLimit),
        p_storage_bytes: 10 * 1024 * 1024 * 1024,
        p_status: body.status,
        p_plan_code: body.planCode,
        p_billing_period: body.billingPeriod,
        p_expires_at: expiresAt,
      });
      if (error) {
        console.error("create_organization_tenant rpc error", error);
        return NextResponse.json({ error: "Şirket oluşturulamadı." }, { status: 500 });
      }
      const payload = result as { ok?: boolean; code?: string; organization?: { id: string; name: string; slug: string; corporate_id: string } } | null;
      if (payload?.ok && payload.organization) {
        return NextResponse.json({ organization: payload.organization });
      }
      if (payload?.code === "DUPLICATE_SLUG_OR_MEMBER" && attempt < 2) continue;
      const messages: Record<string, string> = {
        INVALID_INPUT: "Şirket adı veya vergi numarası geçersiz.",
        DUPLICATE_TAX_NUMBER: "Bu vergi numarası başka bir şirkette kayıtlı.",
        PLAN_NOT_FOUND: "Seçilen paket bulunamadı veya pasif.",
        SEAT_LIMIT_REQUIRED: "Çalışan limiti gerekli.",
        DUPLICATE_SLUG_OR_MEMBER: "Bu şirket bağlantısı zaten kullanılıyor.",
      };
      return NextResponse.json({ error: messages[payload?.code || ""] || "Şirket oluşturulamadı." }, { status: 409 });
    }
    return NextResponse.json({ error: "Şirket oluşturulamadı." }, { status: 500 });
  }

  if (incoming?.action === "attach_manager") {
    const parsed = attachSchema.safeParse(incoming);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Üye bilgisi geçersiz." }, { status: 400 });
    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const inviteExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const { data: result, error } = await ctx.admin.rpc("attach_organization_manager", {
      p_actor_user_id: ctx.user.id,
      p_organization_id: parsed.data.organizationId,
      p_email: parsed.data.email,
      p_full_name: parsed.data.fullName,
      p_role: parsed.data.role,
      p_token_hash: tokenHash,
      p_invite_expires_at: inviteExpiresAt,
    });
    if (error) {
      console.error("attach_organization_manager rpc error", error);
      return NextResponse.json({ error: "Yönetici bağlanamadı." }, { status: 500 });
    }
    const payload = result as { ok?: boolean; code?: string; member?: { email: string; status: string; role: string } } | null;
    if (!payload?.ok || !payload.member) {
      const messages: Record<string, string> = {
        INVALID_ROLE: "Yalnız Owner, Admin veya HR bağlanabilir.",
        MEMBER_EXISTS: "Bu e-posta bu şirkette zaten kayıtlı.",
      };
      return NextResponse.json({ error: messages[payload?.code || ""] || "Yönetici bağlanamadı." }, { status: 409 });
    }
    let emailSent = false;
    if (payload.member.status === "INVITED") {
      const { data: org } = await ctx.admin.from("organizations").select("name").eq("id", parsed.data.organizationId).maybeSingle();
      try {
        await sendOrganizationInviteEmail({
          to: payload.member.email,
          inviteUrl: `${publicSiteUrl}/kurumsal/davet?token=${raw}`,
          organizationName: org?.name || parsed.data.fullName,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("manager invite email failed after attach", emailError);
      }
    }
    return NextResponse.json({ member: payload.member, emailSent, existingUser: payload.member.status === "ACTIVE" });
  }

  const parsed = provisionSchema.safeParse(incoming);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz bilgi." }, { status: 400 });
  const body = parsed.data;

  const baseSlug = normalizeCardSlug(body.name) || "sirket";
  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const inviteExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const termDays = body.termDays ?? (body.billingPeriod === "MONTHLY" ? 30 : 365);
  const subscriptionExpiresAt = new Date(Date.now() + termDays * 86400000).toISOString();

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

export async function PATCH(request: NextRequest) {
  const ctx = await requireAdmin(request);
  if (!ctx) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Durum bilgisi geçersiz." }, { status: 400 });
  const { error } = await ctx.admin.from("organizations").update({ status: parsed.data.status }).eq("id", parsed.data.organizationId);
  if (error) return NextResponse.json({ error: "Şirket durumu güncellenemedi." }, { status: 503 });
  await ctx.admin.from("admin_audit_log").insert({
    actor_user_id: ctx.user.id,
    action: parsed.data.status === "ACTIVE" ? "ORGANIZATION_ACTIVATED" : "ORGANIZATION_SUSPENDED",
    target_table: "organizations",
    target_id: parsed.data.organizationId,
    after_value: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
