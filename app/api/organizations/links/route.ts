import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createOrganizationAssetSignedUrl,
  isOrganizationAssetPubliclyAvailable,
  removeOrganizationAsset,
} from "../../../../lib/organizations/organization-assets";
import { recordOrganizationAuditEvent } from "../../../../lib/organizations/audit";
import { canManageTemplates, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { MFA_REQUIRED_MESSAGE, requiresOrganizationMfaStepUp } from "../../../../lib/organizations/security-policy";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

// Kart şablonundaki "Kurumsal Bağlantılar" bölümünün 4 sabit slotu:
// Ürün Kataloğu, Şirket Sunumu, Toplantı Planla, Referans Projeler.
// Katalog, sunum ve referanslar URL/PDF olabilir. MEETING yalnız takvim
// veya randevu URL'sidir; PDF yükleme upload route'unda ayrıca engellenir.

const KIND_DEFAULTS: Record<string, { label: string; subtitle: string; icon: string }> = {
  CATALOG: { label: "Ürün Kataloğu", subtitle: "Kurumsal ürün ve hizmetler", icon: "box" },
  PRESENTATION: { label: "Şirket Sunumu", subtitle: "Kurumsal sunum", icon: "building" },
  MEETING: { label: "Toplantı Planla", subtitle: "Takvim veya randevu bağlantısı", icon: "clock" },
  REFERENCES: { label: "Referans Projeler", subtitle: "Projeleri incele", icon: "link" },
};
const KINDS = Object.keys(KIND_DEFAULTS);

const postSchema = z.object({
  organizationId: z.string().uuid(),
  kind: z.enum(["CATALOG", "PRESENTATION", "MEETING", "REFERENCES"]),
  label: z.string().trim().max(80).optional(),
  url: z.string().trim().url().max(500),
  publishAt: z.string().datetime().nullable().optional(),
});
const deleteSchema = z.object({ organizationId: z.string().uuid(), kind: z.enum(["CATALOG", "PRESENTATION", "MEETING", "REFERENCES"]) });
const deleteVersionSchema = z.object({
  action: z.literal("DELETE_VERSION"),
  versionId: z.string().uuid(),
});
const patchSchema = z.object({
  organizationId: z.string().uuid(),
  kind: z.enum(["CATALOG", "PRESENTATION", "MEETING", "REFERENCES"]),
  isPublished: z.boolean(),
  publishAt: z.string().datetime().nullable().optional(),
});
const rollbackSchema = z.object({
  action: z.literal("ROLLBACK"),
  organizationId: z.string().uuid(),
  versionId: z.string().uuid(),
});

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient(), token };
}

async function membership(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status").eq("organization_id", organizationId).eq("user_id", userId).eq("status", "ACTIVE").maybeSingle();
  return data && isOrganizationRole(data.role) ? data : null;
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, organizationId);
  if (!member) return NextResponse.json({ error: "Bu şirketin bağlantılarını görme yetkin yok." }, { status: 403 });
  const { data, error } = await ctx.admin.from("organization_links").select("id,kind,label,subtitle,link_type,url,file_path,file_name,file_size,is_published,published_at,publish_at,updated_at").eq("organization_id", organizationId);
  if (error) return NextResponse.json({ error: "Bağlantılar yüklenemedi." }, { status: 500 });
  const byKind = new Map((data || []).map((row) => [row.kind, row]));
  const mayPreviewScheduledAssets = canManageTemplates(member.role, "ACTIVE");
  const links = await Promise.all(KINDS.map(async (kind) => {
    const row = byKind.get(kind);
    const fallback = KIND_DEFAULTS[kind];
    return {
      kind,
      label: row?.label || fallback.label,
      subtitle: row?.subtitle || fallback.subtitle,
      configured: Boolean(row),
      id: row?.id || null,
      isPublished: row?.is_published ?? false,
      publishedAt: row?.published_at || null,
      publishAt: row?.publish_at || null,
      linkType: row?.link_type || null,
      url: row?.url || null,
      fileName: row?.file_name || null,
      fileSize: row?.file_size || null,
      fileUrl: mayPreviewScheduledAssets || isOrganizationAssetPubliclyAvailable(
        row?.is_published,
        row?.publish_at,
      )
        ? await createOrganizationAssetSignedUrl(ctx.admin, row?.file_path)
        : null,
      updatedAt: row?.updated_at || null,
    };
  }));
  let versions: unknown[] = [];
  if (canManageTemplates(member.role, "ACTIVE")) {
    const { data: versionRows } = await ctx.admin
      .from("organization_link_versions")
      .select("id,kind,label,link_type,url,file_path,file_name,file_size,is_published,publish_at,change_reason,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(40);
    versions = await Promise.all((versionRows || []).map(async (version) => ({
      ...version,
      fileUrl: await createOrganizationAssetSignedUrl(ctx.admin, version.file_path),
    })));
  }
  return NextResponse.json({ links, versions });
}

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz bağlantı." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!member || !canManageTemplates(member.role, "ACTIVE")) return NextResponse.json({ error: "Kurumsal bağlantı yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
  if (await requiresOrganizationMfaStepUp(request, ctx.admin, parsed.data.organizationId)) {
    return NextResponse.json({ error: MFA_REQUIRED_MESSAGE, code: "MFA_REQUIRED" }, { status: 403 });
  }

  const publishAt = parsed.data.publishAt || new Date().toISOString();
  const { data: existing } = await ctx.admin
    .from("organization_links")
    .select("file_path")
    .eq("organization_id", parsed.data.organizationId)
    .eq("kind", parsed.data.kind)
    .maybeSingle();
  const { error } = await ctx.admin.from("organization_links").upsert({
    organization_id: parsed.data.organizationId,
    kind: parsed.data.kind,
    label: parsed.data.label || null,
    link_type: "URL",
    url: parsed.data.url,
    file_path: null,
    file_name: null,
    file_size: null,
    updated_by: ctx.user.id,
    is_published: true,
    published_at: publishAt,
    publish_at: publishAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id,kind" });
  if (error) return NextResponse.json({ error: "Bağlantı kaydedilemedi." }, { status: 500 });
  if (existing?.file_path) await removeOrganizationAsset(ctx.admin, existing.file_path);
  await recordOrganizationAuditEvent(ctx.admin, {
    organizationId: parsed.data.organizationId,
    actorUserId: ctx.user.id,
    actorRole: member.role,
    action: "CONTENT_URL_SAVED",
    subjectType: "CORPORATE_LINK",
    subjectId: parsed.data.kind,
    summary: "Kurumsal bağlantı kaydedildi.",
    metadata: { kind: parsed.data.kind, scheduled: Boolean(parsed.data.publishAt) },
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const payload = await request.json();
  if (payload?.action === "ROLLBACK") {
    const rollback = rollbackSchema.safeParse(payload);
    if (!rollback.success) return NextResponse.json({ error: "Geçersiz geri alma isteği." }, { status: 400 });
    const member = await membership(ctx.admin, ctx.user.id, rollback.data.organizationId);
    if (!member || !canManageTemplates(member.role, "ACTIVE")) return NextResponse.json({ error: "Kurumsal bağlantı yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
    if (await requiresOrganizationMfaStepUp(request, ctx.admin, rollback.data.organizationId)) {
      return NextResponse.json({ error: MFA_REQUIRED_MESSAGE, code: "MFA_REQUIRED" }, { status: 403 });
    }
    const { data: version, error: versionError } = await ctx.admin
      .from("organization_link_versions")
      .select("kind,label,subtitle,link_type,url,file_path,file_name,file_size,is_published,publish_at")
      .eq("id", rollback.data.versionId)
      .eq("organization_id", rollback.data.organizationId)
      .maybeSingle();
    if (versionError || !version) return NextResponse.json({ error: "Sürüm bulunamadı." }, { status: 404 });
    if (version.kind === "MEETING" && version.link_type === "FILE") {
      return NextResponse.json({ error: "Toplantı Planla alanına ait eski PDF sürümleri geri alınamaz. Takvim veya randevu bağlantısı kullanın." }, { status: 400 });
    }
    const { error: rollbackError } = await ctx.admin.from("organization_links").upsert({
      organization_id: rollback.data.organizationId,
      ...version,
      published_at: version.is_published ? version.publish_at || new Date().toISOString() : null,
      updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,kind" });
    if (rollbackError) return NextResponse.json({ error: "Sürüm geri alınamadı." }, { status: 500 });
    await ctx.admin.from("organization_link_versions").insert({
      organization_id: rollback.data.organizationId,
      ...version,
      changed_by: ctx.user.id,
      change_reason: "ROLLBACK",
    });
    await recordOrganizationAuditEvent(ctx.admin, {
      organizationId: rollback.data.organizationId,
      actorUserId: ctx.user.id,
      actorRole: member.role,
      action: "CONTENT_ROLLED_BACK",
      subjectType: "CORPORATE_LINK",
      subjectId: version.kind,
      summary: "Kurumsal bağlantı önceki sürüme geri alındı.",
      metadata: { kind: version.kind },
    });
    return NextResponse.json({ ok: true });
  }
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!member || !canManageTemplates(member.role, "ACTIVE")) return NextResponse.json({ error: "Kurumsal bağlantı yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
  if (await requiresOrganizationMfaStepUp(request, ctx.admin, parsed.data.organizationId)) {
    return NextResponse.json({ error: MFA_REQUIRED_MESSAGE, code: "MFA_REQUIRED" }, { status: 403 });
  }
  const { data, error } = await ctx.admin
    .from("organization_links")
    .update({
      is_published: parsed.data.isPublished,
      published_at: parsed.data.isPublished ? parsed.data.publishAt || new Date().toISOString() : null,
      publish_at: parsed.data.isPublished ? parsed.data.publishAt || new Date().toISOString() : null,
      updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", parsed.data.organizationId)
    .eq("kind", parsed.data.kind)
    .select("kind,is_published,published_at,publish_at")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Yayın durumu güncellenemedi." }, { status: 500 });
  await recordOrganizationAuditEvent(ctx.admin, {
    organizationId: parsed.data.organizationId,
    actorUserId: ctx.user.id,
    actorRole: member.role,
    action: "CONTENT_PUBLICATION_CHANGED",
    subjectType: "CORPORATE_LINK",
    subjectId: parsed.data.kind,
    summary: parsed.data.isPublished ? "Kurumsal bağlantı yayınlandı." : "Kurumsal bağlantı yayından kaldırıldı.",
    metadata: { kind: parsed.data.kind, published: parsed.data.isPublished, scheduled: Boolean(parsed.data.publishAt) },
  });
  return NextResponse.json({ ok: true, link: data });
}

export async function DELETE(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const payload = await request.json();

  if (payload?.action === "DELETE_VERSION") {
    const parsedVersion = deleteVersionSchema.safeParse(payload);
    if (!parsedVersion.success) return NextResponse.json({ error: "Geçersiz sürüm silme isteği." }, { status: 400 });

    const { data: version, error: versionError } = await ctx.admin
      .from("organization_link_versions")
      .select("id,organization_id")
      .eq("id", parsedVersion.data.versionId)
      .maybeSingle();
    if (versionError || !version) return NextResponse.json({ error: "Sürüm bulunamadı." }, { status: 404 });

    const member = await membership(ctx.admin, ctx.user.id, version.organization_id);
    if (!member || !canManageTemplates(member.role, "ACTIVE")) {
      return NextResponse.json({ error: "Sürüm geçmişini yalnız şirket sahibi ve yöneticiler düzenleyebilir." }, { status: 403 });
    }
    if (await requiresOrganizationMfaStepUp(request, ctx.admin, version.organization_id)) {
      return NextResponse.json({ error: MFA_REQUIRED_MESSAGE, code: "MFA_REQUIRED" }, { status: 403 });
    }

    const { error: deleteVersionError } = await ctx.admin
      .from("organization_link_versions")
      .delete()
      .eq("id", parsedVersion.data.versionId)
      .eq("organization_id", version.organization_id);
    if (deleteVersionError) return NextResponse.json({ error: "Sürüm silinemedi." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!member || !canManageTemplates(member.role, "ACTIVE")) return NextResponse.json({ error: "Kurumsal bağlantı yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
  if (await requiresOrganizationMfaStepUp(request, ctx.admin, parsed.data.organizationId)) {
    return NextResponse.json({ error: MFA_REQUIRED_MESSAGE, code: "MFA_REQUIRED" }, { status: 403 });
  }
  const { data: existing } = await ctx.admin
    .from("organization_links")
    .select("file_path")
    .eq("organization_id", parsed.data.organizationId)
    .eq("kind", parsed.data.kind)
    .maybeSingle();
  const { error } = await ctx.admin.from("organization_links").delete().eq("organization_id", parsed.data.organizationId).eq("kind", parsed.data.kind);
  if (error) return NextResponse.json({ error: "Bağlantı kaldırılamadı." }, { status: 500 });
  if (existing?.file_path) await removeOrganizationAsset(ctx.admin, existing.file_path);
  await recordOrganizationAuditEvent(ctx.admin, {
    organizationId: parsed.data.organizationId,
    actorUserId: ctx.user.id,
    actorRole: member.role,
    action: "CONTENT_REMOVED",
    subjectType: "CORPORATE_LINK",
    subjectId: parsed.data.kind,
    summary: "Kurumsal bağlantı kaldırıldı.",
    metadata: { kind: parsed.data.kind },
  });
  return NextResponse.json({ ok: true });
}
