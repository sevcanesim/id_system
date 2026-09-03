import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageOrganizationLegalProfile, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const schema = z.object({
  organizationId: z.string().uuid(),
  legalName: nullableText(160),
  taxIdType: z.enum(["VKN", "TCKN"]).nullable().optional(),
  taxNumber: z.string().trim().regex(/^\d{10,11}$/, "Vergi/T.C. kimlik numarası 10 veya 11 haneli olmalı.").nullable().optional(),
  taxOffice: nullableText(120),
  mersisNumber: z.string().trim().regex(/^\d{16}$/, "MERSİS numarası 16 haneli olmalı.").nullable().optional(),
  tradeRegistryNumber: nullableText(80),
  billingAddress: nullableText(500),
  billingCity: nullableText(80),
  billingDistrict: nullableText(80),
  billingPostalCode: nullableText(20),
  billingEmail: z.string().trim().email("Geçerli bir fatura e-postası girin.").max(160).nullable().optional(),
  billingPhone: nullableText(40),
  authorizedPersonName: nullableText(120),
}).superRefine((value, ctx) => {
  if (!value.taxNumber) return;
  if (!value.taxIdType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["taxIdType"], message: "Vergi kimlik türü gerekli." });
    return;
  }
  const expected = value.taxIdType === "VKN" ? 10 : 11;
  if (value.taxNumber.length !== expected) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["taxNumber"], message: value.taxIdType === "VKN" ? "VKN 10 haneli olmalı." : "TCKN 11 haneli olmalı." });
  }
});

const selectFields = "id,name,slug,status,legal_name,tax_id_type,tax_number,tax_office,mersis_number,trade_registry_number,billing_address,billing_city,billing_district,billing_postal_code,billing_country_code,billing_email,billing_phone,authorized_person_name,updated_at";

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function membership(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status").eq("organization_id", organizationId).eq("user_id", userId).eq("status", "ACTIVE").maybeSingle();
  return data && isOrganizationRole(data.role) ? data : null;
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return NextResponse.json({ error: "Geçerli şirket kimliği gerekli." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, organizationId);
  if (!member) return NextResponse.json({ error: "Şirket erişimi bulunamadı." }, { status: 403 });
  const { data, error } = await ctx.admin.from("organizations").select(selectFields).eq("id", organizationId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Şirket profili okunamadı." }, { status: 404 });
  return NextResponse.json({ organization: data, canEdit: canManageOrganizationLegalProfile(member.role, member.status) });
}

export async function PATCH(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz şirket profili." }, { status: 400 });
  const input = parsed.data;
  const member = await membership(ctx.admin, ctx.user.id, input.organizationId);
  if (!member || !canManageOrganizationLegalProfile(member.role, member.status)) return NextResponse.json({ error: "Şirket vergi ve fatura profilini yalnız şirket sahibi güncelleyebilir." }, { status: 403 });

  const { data: before, error: beforeError } = await ctx.admin.from("organizations").select(selectFields).eq("id", input.organizationId).maybeSingle();
  if (beforeError || !before) return NextResponse.json({ error: "Şirket profili okunamadı." }, { status: 404 });

  const values = {
    legal_name: input.legalName ?? null,
    tax_id_type: input.taxIdType ?? null,
    tax_number: input.taxNumber ?? null,
    tax_office: input.taxOffice ?? null,
    mersis_number: input.mersisNumber ?? null,
    trade_registry_number: input.tradeRegistryNumber ?? null,
    billing_address: input.billingAddress ?? null,
    billing_city: input.billingCity ?? null,
    billing_district: input.billingDistrict ?? null,
    billing_postal_code: input.billingPostalCode ?? null,
    billing_email: input.billingEmail ?? null,
    billing_phone: input.billingPhone ?? null,
    authorized_person_name: input.authorizedPersonName ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: after, error } = await ctx.admin.from("organizations").update(values).eq("id", input.organizationId).select(selectFields).maybeSingle();
  if (error || !after) {
    if (error?.code === "23505") return NextResponse.json({ error: "Bu vergi numarası başka bir şirket kaydında kullanılıyor." }, { status: 409 });
    return NextResponse.json({ error: "Şirket profili güncellenemedi." }, { status: 500 });
  }

  await ctx.admin.from("admin_audit_log").insert({
    actor_user_id: ctx.user.id,
    action: "ORGANIZATION_PROFILE_UPDATED",
    target_table: "organizations",
    target_id: input.organizationId,
    before_value: before,
    after_value: after,
  });

  return NextResponse.json({ organization: after });
}
