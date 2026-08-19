import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageTemplates, canReadOrganization, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

const schema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB biçiminde olmalı.").optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  fields: z.record(z.union([z.string(), z.boolean()])).optional(),
  isDefault: z.boolean().default(true),
});

const patchSchema = z.union([
  z.object({
    action: z.literal("ACTIVATE"),
    organizationId: z.string().uuid(),
    templateId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("UPDATE").default("UPDATE"),
    templateId: z.string().uuid(),
    name: z.string().trim().min(2).max(80).optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB biçiminde olmalı.").optional(),
    logoUrl: z.string().url().optional().or(z.literal("")),
    fields: z.record(z.union([z.string(), z.boolean()])).optional(),
  }),
]);

const deleteSchema = z.object({
  organizationId: z.string().uuid(),
  templateId: z.string().uuid(),
});

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function membership(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  return data && isOrganizationRole(data.role) ? data : null;
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, organizationId);
  if (!member || !canReadOrganization(member.role, member.status)) return NextResponse.json({ error: "Bu şirketin şablonlarını görme yetkin yok." }, { status: 403 });
  const { data, error } = await ctx.admin
    .from("organization_card_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Şablonlar yüklenemedi." }, { status: 500 });
  return NextResponse.json({ templates: data || [] });
}

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz şablon." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!member || !canManageTemplates(member.role, member.status)) return NextResponse.json({ error: "Şablon yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
  if (parsed.data.isDefault) {
    const { data, error } = await ctx.admin.rpc("set_default_organization_template", {
      p_actor_user_id: ctx.user.id,
      p_organization_id: parsed.data.organizationId,
      p_name: parsed.data.name,
      p_primary_color: parsed.data.primaryColor || null,
      p_logo_url: parsed.data.logoUrl || "",
    });
    const result = data as { ok?: boolean; template?: unknown } | null;
    if (error || !result?.ok) return NextResponse.json({ error: "Şablon kaydedilemedi." }, { status: 500 });
    const template = result.template as { id?: string } | undefined;
    if (template?.id && parsed.data.fields) {
      const { data: updated } = await ctx.admin.from("organization_card_templates").update({ fields: parsed.data.fields }).eq("id", template.id).select().single();
      return NextResponse.json({ template: updated || template }, { status: 201 });
    }
    return NextResponse.json({ template }, { status: 201 });
  }
  const { data, error } = await ctx.admin.from("organization_card_templates").insert({ organization_id: parsed.data.organizationId, name: parsed.data.name, primary_color: parsed.data.primaryColor || null, logo_url: parsed.data.logoUrl || null, fields: parsed.data.fields || {}, is_default: false }).select().single();
  if (error) return NextResponse.json({ error: "Şablon kaydedilemedi." }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}

// PATCH iki işlemi kapsar:
//  - action:"UPDATE" (varsayılan) — kayıtlı bir şablonu YERİNDE düzenler,
//    is_default'a dokunmaz. Aktif/varsayılan şablonu her "Kaydet" işleminde
//    yeni bir satır olarak biriktirmemek için eklendi (bkz. migration
//    20260812090000_organization_template_management.sql).
//  - action:"ACTIVATE" — kayıtlı, varsayılan olmayan bir şablonu kopya
//    oluşturmadan varsayılan yapar ("bu şablonu kullan").
export async function PATCH(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz istek." }, { status: 400 });

  if (parsed.data.action === "ACTIVATE") {
    const { data, error } = await ctx.admin.rpc("activate_organization_template", {
      p_actor_user_id: ctx.user.id,
      p_organization_id: parsed.data.organizationId,
      p_template_id: parsed.data.templateId,
    });
    const result = data as { ok?: boolean; code?: string; template?: unknown } | null;
    if (error || !result?.ok) {
      const code = result?.code;
      const message = code === "FORBIDDEN" ? "Şablon yönetimi yalnız şirket sahibi ve yöneticilere açıktır." : code === "NOT_FOUND" ? "Şablon bulunamadı." : "Şablon etkinleştirilemedi.";
      return NextResponse.json({ error: message }, { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 500 });
    }
    return NextResponse.json({ template: result.template });
  }

  const { data, error } = await ctx.admin.rpc("update_organization_template", {
    p_actor_user_id: ctx.user.id,
    p_template_id: parsed.data.templateId,
    p_name: parsed.data.name || null,
    p_primary_color: parsed.data.primaryColor || null,
    p_logo_url: parsed.data.logoUrl || "",
    p_fields: parsed.data.fields || null,
  });
  const result = data as { ok?: boolean; code?: string; template?: unknown } | null;
  if (error || !result?.ok) {
    const code = result?.code;
    const message = code === "FORBIDDEN" ? "Şablon yönetimi yalnız şirket sahibi ve yöneticilere açıktır." : code === "NOT_FOUND" ? "Şablon bulunamadı." : "Şablon güncellenemedi.";
    return NextResponse.json({ error: message }, { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 500 });
  }
  return NextResponse.json({ template: result.template });
}

// Varsayılan OLMAYAN bir şablonu siler. Aktif/varsayılan şablon silinemez —
// önce başka bir şablon "ACTIVATE" ile varsayılan yapılmalı.
export async function DELETE(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz istek." }, { status: 400 });

  const { data, error } = await ctx.admin.rpc("delete_organization_template", {
    p_actor_user_id: ctx.user.id,
    p_organization_id: parsed.data.organizationId,
    p_template_id: parsed.data.templateId,
  });
  const result = data as { ok?: boolean; code?: string } | null;
  if (error || !result?.ok) {
    const code = result?.code;
    const message = code === "FORBIDDEN" ? "Şablon yönetimi yalnız şirket sahibi ve yöneticilere açıktır." : code === "NOT_FOUND" ? "Şablon bulunamadı." : code === "IS_DEFAULT" ? "Aktif/varsayılan şablon silinemez. Önce başka bir şablonu varsayılan yap." : "Şablon silinemedi.";
    return NextResponse.json({ error: message }, { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "IS_DEFAULT" ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
