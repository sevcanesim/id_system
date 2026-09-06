import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageTemplates, canReadOrganization, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";

const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "Logo adresi HTTPS ile başlamalı.");

const createSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB biçiminde olmalı.").optional(),
  logoUrl: httpsUrl.optional().or(z.literal("")),
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
    logoUrl: httpsUrl.optional().or(z.literal("")),
    fields: z.record(z.union([z.string(), z.boolean()])).optional(),
  }),
]);

const deleteSchema = z.object({
  organizationId: z.string().uuid(),
  templateId: z.string().uuid(),
});

async function requestContext(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  return identity ? { user: identity.user, admin: getSupabaseAdminClient() } : null;
}

async function getMembership(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  organizationId: string,
) {
  const { data } = await admin
    .from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  return data && isOrganizationRole(data.role) ? data : null;
}

async function readJson(request: NextRequest) {
  return request.json().catch(() => null);
}

export async function GET(request: NextRequest) {
  const context = await requestContext(request);
  if (!context) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });

  const member = await getMembership(context.admin, context.user.id, organizationId);
  if (!member || !canReadOrganization(member.role, member.status)) {
    return NextResponse.json({ error: "Bu şirketin şablonlarını görme yetkin yok." }, { status: 403 });
  }

  const { data, error } = await context.admin
    .from("organization_card_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Şablonlar yüklenemedi." }, { status: 500 });
  return NextResponse.json({ templates: data || [] });
}

export async function POST(request: NextRequest) {
  const context = await requestContext(request);
  if (!context) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz şablon." }, { status: 400 });
  }

  const member = await getMembership(context.admin, context.user.id, parsed.data.organizationId);
  if (!member || !canManageTemplates(member.role, member.status)) {
    return NextResponse.json({ error: "Şablon yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
  }

  if (parsed.data.isDefault) {
    const { data, error } = await context.admin.rpc("set_default_organization_template", {
      p_actor_user_id: context.user.id,
      p_organization_id: parsed.data.organizationId,
      p_name: parsed.data.name,
      p_primary_color: parsed.data.primaryColor || null,
      p_logo_url: parsed.data.logoUrl || "",
    });
    const result = data as { ok?: boolean; template?: unknown } | null;
    if (error || !result?.ok) {
      return NextResponse.json({ error: "Şablon kaydedilemedi." }, { status: 500 });
    }

    const template = result.template as { id?: string } | undefined;
    if (template?.id && parsed.data.fields) {
      const { data: updated, error: updateError } = await context.admin
        .from("organization_card_templates")
        .update({ fields: parsed.data.fields })
        .eq("id", template.id)
        .eq("organization_id", parsed.data.organizationId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: "Şablon kaydedildi ancak alan ayarları güncellenemedi." }, { status: 500 });
      }
      return NextResponse.json({ template: updated }, { status: 201 });
    }

    return NextResponse.json({ template }, { status: 201 });
  }

  const { data, error } = await context.admin
    .from("organization_card_templates")
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      primary_color: parsed.data.primaryColor || null,
      logo_url: parsed.data.logoUrl || null,
      fields: parsed.data.fields || {},
      is_default: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Şablon kaydedilemedi." }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requestContext(request);
  if (!context) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz istek." }, { status: 400 });
  }

  if (parsed.data.action === "ACTIVATE") {
    const { data, error } = await context.admin.rpc("activate_organization_template", {
      p_actor_user_id: context.user.id,
      p_organization_id: parsed.data.organizationId,
      p_template_id: parsed.data.templateId,
    });
    const result = data as { ok?: boolean; code?: string; template?: unknown } | null;

    if (error || !result?.ok) {
      const code = result?.code;
      const message =
        code === "FORBIDDEN"
          ? "Şablon yönetimi yalnız şirket sahibi ve yöneticilere açıktır."
          : code === "NOT_FOUND"
            ? "Şablon bulunamadı."
            : "Şablon etkinleştirilemedi.";
      return NextResponse.json(
        { error: message },
        { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 500 },
      );
    }

    return NextResponse.json({ template: result.template });
  }

  const { data, error } = await context.admin.rpc("update_organization_template", {
    p_actor_user_id: context.user.id,
    p_template_id: parsed.data.templateId,
    p_name: parsed.data.name || null,
    p_primary_color: parsed.data.primaryColor || null,
    p_logo_url: parsed.data.logoUrl || "",
    p_fields: parsed.data.fields || null,
  });
  const result = data as { ok?: boolean; code?: string; template?: unknown } | null;

  if (error || !result?.ok) {
    const code = result?.code;
    const message =
      code === "FORBIDDEN"
        ? "Şablon yönetimi yalnız şirket sahibi ve yöneticilere açıktır."
        : code === "NOT_FOUND"
          ? "Şablon bulunamadı."
          : "Şablon güncellenemedi.";
    return NextResponse.json(
      { error: message },
      { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 500 },
    );
  }

  return NextResponse.json({ template: result.template });
}

export async function DELETE(request: NextRequest) {
  const context = await requestContext(request);
  if (!context) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const parsed = deleteSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz istek." }, { status: 400 });
  }

  const { data, error } = await context.admin.rpc("delete_organization_template", {
    p_actor_user_id: context.user.id,
    p_organization_id: parsed.data.organizationId,
    p_template_id: parsed.data.templateId,
  });
  const result = data as { ok?: boolean; code?: string } | null;

  if (error || !result?.ok) {
    const code = result?.code;
    const message =
      code === "FORBIDDEN"
        ? "Şablon yönetimi yalnız şirket sahibi ve yöneticilere açıktır."
        : code === "NOT_FOUND"
          ? "Şablon bulunamadı."
          : code === "IS_DEFAULT"
            ? "Aktif/varsayılan şablon silinemez. Önce başka bir şablonu varsayılan yap."
            : "Şablon silinemedi.";
    return NextResponse.json(
      { error: message },
      { status: code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "IS_DEFAULT" ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
