import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

// Çalışanın, şirketin pozisyon kataloğunda olmayan bir ünvan istediği
// durumlar için onay akışı (yetki matrisindeki Ünvan satırında
// çalışan için "reddet / talep" karşılığı). Talep İK/Yönetici tarafından
// onaylanınca hem çalışanın kaydı hem de
// kataloğu güncellenir — bkz. `resolve_member_title_request` RPC'si.

const postSchema = z.object({ organizationId: z.string().uuid(), title: z.string().trim().min(2).max(120) });
const patchSchema = z.object({ requestId: z.string().uuid(), approve: z.boolean(), note: z.string().trim().max(500).optional() });

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });
  const { data: actor } = await ctx.admin.from("organization_members").select("id,role,status,department").eq("organization_id", organizationId).eq("user_id", ctx.user.id).eq("status", "ACTIVE").maybeSingle();
  if (!actor || !isOrganizationRole(actor.role)) return NextResponse.json({ error: "Ünvan taleplerini görme yetkin yok." }, { status: 403 });
  const manager = ["OWNER", "ADMIN", "HR"].includes(actor.role);
  let query = ctx.admin.from("member_title_requests").select("id,member_id,requested_title,status,note,created_at,resolved_at,organization_members!inner(full_name,department)").eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (!manager) query = query.eq("member_id", actor.id).limit(5);
  else query = query.eq("status", "PENDING");
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Talepler yüklenemedi." }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz talep." }, { status: 400 });
  const { data: member } = await ctx.admin.from("organization_members").select("id,status").eq("organization_id", parsed.data.organizationId).eq("user_id", ctx.user.id).eq("status", "ACTIVE").maybeSingle();
  if (!member) return NextResponse.json({ error: "Bu şirkette aktif üyeliğin yok." }, { status: 403 });
  const { data: pending } = await ctx.admin.from("member_title_requests").select("id,requested_title,status,created_at").eq("member_id", member.id).eq("status", "PENDING").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (pending) return NextResponse.json({ error: "Zaten bekleyen bir ünvan talebin var.", request: pending }, { status: 409 });
  const { data, error } = await ctx.admin.from("member_title_requests").insert({ organization_id: parsed.data.organizationId, member_id: member.id, requested_title: parsed.data.title }).select("id,status,created_at").maybeSingle();
  if (error) return NextResponse.json({ error: "Talep gönderilemedi." }, { status: 500 });
  return NextResponse.json({ request: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const { data, error } = await ctx.admin.rpc("resolve_member_title_request", {
    p_actor_user_id: ctx.user.id,
    p_request_id: parsed.data.requestId,
    p_approve: parsed.data.approve,
    p_note: parsed.data.note || null,
  });
  const result = data as { ok?: boolean; code?: string } | null;
  if (error || !result?.ok) {
    const status = result?.code === "FORBIDDEN" ? 403 : result?.code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: result?.code === "FORBIDDEN" ? "Bu talebi çözme yetkin yok." : "Talep işlenemedi." }, { status });
  }
  return NextResponse.json({ ok: true });
}
