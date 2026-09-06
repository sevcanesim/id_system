import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageTemplates, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";

// Şirketin gerçek pozisyon kataloğu. Çalışan kart formundaki Ünvan
// alanı serbest metin değil, yalnızca bu listeden seçilir (bkz.
// `save_own_card_profile` RPC'si). Kataloğu yönetmek (ekleme/silme)
// şablon yönetimiyle aynı yetki seviyesini gerektirir (OWNER/ADMIN);
// tüm aktif üyeler listeyi okuyabilir.

const postSchema = z.object({ organizationId: z.string().uuid(), title: z.string().trim().min(2).max(120) });
const deleteSchema = z.object({ organizationId: z.string().uuid(), id: z.string().uuid() });

async function context(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return null;
  return { user: identity.user, admin: getSupabaseAdminClient() };
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
  if (!member) return NextResponse.json({ error: "Bu şirketin pozisyonlarını görme yetkin yok." }, { status: 403 });
  const { data, error } = await ctx.admin.from("organization_job_titles").select("id,title,created_at").eq("organization_id", organizationId).order("title");
  if (error) return NextResponse.json({ error: "Pozisyonlar yüklenemedi." }, { status: 500 });
  return NextResponse.json({ titles: data || [] });
}

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz pozisyon." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!member || !canManageTemplates(member.role, "ACTIVE")) return NextResponse.json({ error: "Pozisyon kataloğu yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
  const { data, error } = await ctx.admin.from("organization_job_titles").insert({ organization_id: parsed.data.organizationId, title: parsed.data.title, created_by: ctx.user.id }).select("id,title,created_at").maybeSingle();
  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) return NextResponse.json({ error: "Bu pozisyon zaten kayıtlı." }, { status: 409 });
    return NextResponse.json({ error: "Pozisyon eklenemedi." }, { status: 500 });
  }
  return NextResponse.json({ title: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!member || !canManageTemplates(member.role, "ACTIVE")) return NextResponse.json({ error: "Pozisyon kataloğu yönetimi yalnız şirket sahibi ve yöneticilere açıktır." }, { status: 403 });
  const { error } = await ctx.admin.from("organization_job_titles").delete().eq("id", parsed.data.id).eq("organization_id", parsed.data.organizationId);
  if (error) return NextResponse.json({ error: "Pozisyon silinemedi." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
