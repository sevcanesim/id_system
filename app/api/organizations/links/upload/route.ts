import { NextRequest, NextResponse } from "next/server";
import {
  createOrganizationAssetSignedUrl,
  removeOrganizationAsset,
} from "../../../../../lib/organizations/organization-assets";
import { recordOrganizationAuditEvent } from "../../../../../lib/organizations/audit";
import { canManageTemplates, isOrganizationRole } from "../../../../../lib/organizations/permissions";
import { MFA_REQUIRED_MESSAGE, requiresOrganizationMfaStepUp } from "../../../../../lib/organizations/security-policy";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { resolveRequestIdentity } from "../../../../../lib/auth/request-identity";

// PDF is intentionally limited to document-oriented slots.
// MEETING is a calendar/booking URL and must never accept file uploads.
const VALID_KINDS = new Set(["CATALOG", "PRESENTATION", "REFERENCES"]);
const MAX_SIZE = 20 * 1024 * 1024;

async function context(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return null;
  return { user: identity.user, admin: getSupabaseAdminClient() };
}

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Geçersiz form verisi." }, { status: 400 });
  const organizationId = String(form.get("organizationId") || "");
  const kind = String(form.get("kind") || "");
  const label = String(form.get("label") || "").trim().slice(0, 80) || null;
  const publishAtRaw = String(form.get("publishAt") || "").trim();
  const publishAt = publishAtRaw && !Number.isNaN(Date.parse(publishAtRaw)) ? new Date(publishAtRaw).toISOString() : new Date().toISOString();
  const file = form.get("file");

  if (kind === "MEETING") {
    return NextResponse.json({ error: "Toplantı Planla alanı yalnız takvim veya randevu bağlantısı kabul eder." }, { status: 400 });
  }
  if (!organizationId || !VALID_KINDS.has(kind)) return NextResponse.json({ error: "Geçersiz bağlantı türü." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "PDF dosyası gerekli." }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Yalnızca PDF dosyası yüklenebilir." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "PDF en fazla 20 MB olabilir." }, { status: 400 });

  const { data: member } = await ctx.admin.from("organization_members").select("role,status").eq("organization_id", organizationId).eq("user_id", ctx.user.id).eq("status", "ACTIVE").maybeSingle();
  if (!member || !isOrganizationRole(member.role) || !canManageTemplates(member.role, "ACTIVE")) {
    return NextResponse.json({ error: "Kurumsal bağlantı yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
  }
  if (await requiresOrganizationMfaStepUp(request, ctx.admin, organizationId)) {
    return NextResponse.json({ error: MFA_REQUIRED_MESSAGE, code: "MFA_REQUIRED" }, { status: 403 });
  }

  const { data: existing } = await ctx.admin
    .from("organization_links")
    .select("file_path")
    .eq("organization_id", organizationId)
    .eq("kind", kind)
    .maybeSingle();

  const path = `${organizationId}/${kind.toLowerCase()}-${Date.now()}.pdf`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await ctx.admin.storage.from("organization-assets").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: "PDF yüklenemedi." }, { status: 500 });

  const { error: dbError } = await ctx.admin.from("organization_links").upsert({
    organization_id: organizationId,
    kind,
    label,
    link_type: "FILE",
    url: null,
    file_path: path,
    file_name: file.name,
    file_size: file.size,
    is_published: true,
    published_at: publishAt,
    publish_at: publishAt,
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id,kind" });
  if (dbError) {
    await removeOrganizationAsset(ctx.admin, path);
    return NextResponse.json({ error: "Bağlantı kaydedilemedi." }, { status: 500 });
  }
  if (existing?.file_path && existing.file_path !== path) {
    await removeOrganizationAsset(ctx.admin, existing.file_path);
  }

  await recordOrganizationAuditEvent(ctx.admin, {
    organizationId,
    actorUserId: ctx.user.id,
    actorRole: member.role,
    action: "CONTENT_URL_SAVED",
    subjectType: "CORPORATE_LINK",
    subjectId: kind,
    summary: "Kurumsal PDF içeriği yüklendi.",
    metadata: { kind, source: "PDF", scheduled: Boolean(publishAtRaw) },
  });

  const fileUrl = await createOrganizationAssetSignedUrl(ctx.admin, path);
  return NextResponse.json({ ok: true, fileUrl, fileName: file.name, fileSize: file.size }, { status: 201 });
}
