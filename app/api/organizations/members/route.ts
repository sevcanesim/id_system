import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOrganizationInviteEmail } from "../../../../lib/email/resend";
import { canInviteRole, canManageMemberIdentity, canManageMemberInDepartment, isDepartmentScoped, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

const createSchema = z.object({ organizationId: z.string().uuid(), email: z.string().email(), fullName: z.string().trim().min(2).max(120), title: z.string().trim().max(120).optional(), department: z.string().trim().max(120).optional(), role: z.enum(["ADMIN", "HR", "DEPARTMENT_MANAGER", "EMPLOYEE"]).default("EMPLOYEE") });
const statusPatchSchema = z.object({ action: z.literal("STATUS").default("STATUS"), organizationId: z.string().uuid(), memberId: z.string().uuid(), status: z.enum(["ACTIVE", "SUSPENDED", "LEFT"]), reason: z.string().trim().max(500).optional() });
const identityPatchSchema = z.object({
  action: z.literal("IDENTITY"),
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  title: z.string().trim().max(120).optional().default(""),
  department: z.string().trim().max(120).optional().default(""),
});
const roleSchema = z.object({ organizationId: z.string().uuid(), memberId: z.string().uuid(), role: z.enum(["ADMIN", "HR", "DEPARTMENT_MANAGER", "EMPLOYEE"]), reason: z.string().trim().max(500).optional() });

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function manager(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status,department").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  return data && data.status === "ACTIVE" && isOrganizationRole(data.role) ? data : null;
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });

  // Any active member may read their own membership row (title/department/role),
  // regardless of rank — used to prefill/lock an employee's own card fields with
  // the company's centrally managed identity. This never exposes other members.
  if (request.nextUrl.searchParams.get("self") === "true") {
    const { data, error } = await ctx.admin
      .from("organization_members")
      .select("id,email,full_name,title,department,role,status,created_at,last_activity_at")
      .eq("organization_id", organizationId)
      .eq("user_id", ctx.user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Üyelik bilgisi yüklenemedi." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Bu şirkette aktif üyeliğin yok." }, { status: 404 });
    return NextResponse.json({ member: data });
  }

  const actor = await manager(ctx.admin, ctx.user.id, organizationId);
  if (!actor || !["OWNER", "ADMIN", "HR", "DEPARTMENT_MANAGER"].includes(actor.role)) return NextResponse.json({ error: "Üye listesini görme yetkin yok." }, { status: 403 });
  if (isDepartmentScoped(actor.role) && !actor.department) return NextResponse.json({ error: "Departman yöneticisine departman atanmamış." }, { status: 409 });
  const memberColumns = "id,email,full_name,title,department,role,status,created_at,last_activity_at,user_id";
  let membersQuery = ctx.admin.from("organization_members").select(memberColumns).eq("organization_id", organizationId);
  if (isDepartmentScoped(actor.role)) membersQuery = membersQuery.eq("department", actor.department as string);
  let { data, error } = await membersQuery.order("created_at");

  // Defensive fallback: if last_activity_at hasn't been migrated onto this
  // environment yet (undefined_column, Postgres code 42703), retry without
  // it instead of failing the whole panel. created_at is used in its place
  // by the UI (relativeTime(member.last_activity_at || member.created_at)).
  if (error && error.code === "42703") {
    let fallbackQuery = ctx.admin
      .from("organization_members")
      .select("id,email,full_name,title,department,role,status,created_at,user_id")
      .eq("organization_id", organizationId);
    if (isDepartmentScoped(actor.role)) fallbackQuery = fallbackQuery.eq("department", actor.department as string);
    const fallback = await fallbackQuery.order("created_at");
    data = fallback.data?.map((row) => ({ ...row, last_activity_at: null as string | null })) ?? null;
    error = fallback.error;
    if (!error) {
      console.error(
        "[organizations/members] last_activity_at column missing — migration 20260818190000_member_activity_timestamps.sql görünüşe göre bu ortama uygulanmamış. Panel created_at'e geri düşerek çalışmaya devam ediyor.",
      );
    }
  }

  if (error) {
    console.error("[organizations/members] Çalışanlar sorgusu başarısız:", { organizationId, code: error.code, message: error.message });
    return NextResponse.json({ error: "Çalışanlar yüklenemedi." }, { status: 500 });
  }
  return NextResponse.json({ members: data || [], permissions: { canInviteAdmin: actor.role === "OWNER", canManageTemplates: ["OWNER", "ADMIN"].includes(actor.role) } });
}

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz bilgi." }, { status: 400 });
  const actor = await manager(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!actor || !canInviteRole(actor.role, parsed.data.role)) return NextResponse.json({ error: "Bu rol için davet oluşturma yetkin yok." }, { status: 403 });
  if (isDepartmentScoped(actor.role) && !actor.department) return NextResponse.json({ error: "Departman yöneticisine departman atanmamış." }, { status: 409 });
  const invitationDepartment = isDepartmentScoped(actor.role) ? actor.department || "" : parsed.data.department || "";
  const { data: org } = await ctx.admin.from("organizations").select("name").eq("id", parsed.data.organizationId).single();
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  const { data: reservation, error } = await ctx.admin.rpc("reserve_organization_invitation", {
    p_actor_user_id: ctx.user.id,
    p_organization_id: parsed.data.organizationId,
    p_email: parsed.data.email,
    p_full_name: parsed.data.fullName,
    p_title: parsed.data.title || "",
    p_department: invitationDepartment,
    p_role: parsed.data.role,
    p_token_hash: hash,
    p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  const result = reservation as { ok?: boolean; code?: string; member?: Record<string, unknown> } | null;
  if (error || !result?.ok || !result.member) {
    const status = result?.code === "SEAT_LIMIT" || result?.code === "DUPLICATE" ? 409 : result?.code === "NO_SUBSCRIPTION" || result?.code === "FORBIDDEN" ? 403 : 500;
    const message = result?.code === "SEAT_LIMIT" ? "Paket lisans sınırına ulaşıldı." : result?.code === "DUPLICATE" ? "Bu e-posta şirkette zaten kayıtlı." : result?.code === "NO_SUBSCRIPTION" ? "Aktif kurumsal abonelik bulunamadı." : result?.code === "FORBIDDEN" ? "Bu rol için davet oluşturma yetkin yok." : "Davet kaydı oluşturulamadı.";
    return NextResponse.json({ error: message }, { status });
  }
  const data = result.member as { id: string; email: string; [key: string]: unknown };
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const mail = await sendOrganizationInviteEmail({ to: data.email, inviteUrl: `${base}/kurumsal/davet?token=${raw}`, organizationName: org?.name || "Şirket" });
  return NextResponse.json({ member: data, emailSent: mail.sent }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const payload = await request.json();

  if (payload?.action === "IDENTITY") {
    const parsed = identityPatchSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz çalışan bilgisi." }, { status: 400 });
    const actor = await manager(ctx.admin, ctx.user.id, parsed.data.organizationId);
    if (!actor || !["OWNER", "ADMIN", "HR", "DEPARTMENT_MANAGER"].includes(actor.role)) return NextResponse.json({ error: "Çalışan bilgilerini düzenleme yetkin yok." }, { status: 403 });

    const { data: target, error: targetError } = await ctx.admin
      .from("organization_members")
      .select("id,user_id,email,full_name,title,department,role,status")
      .eq("id", parsed.data.memberId)
      .eq("organization_id", parsed.data.organizationId)
      .maybeSingle();
    if (targetError) return NextResponse.json({ error: "Çalışan bilgileri okunamadı." }, { status: 500 });
    if (!target) return NextResponse.json({ error: "Çalışan bulunamadı." }, { status: 404 });
    if (!isOrganizationRole(target.role) || !canManageMemberIdentity(actor.role, actor.department, target.role, target.department, target.user_id === ctx.user.id)) {
      return NextResponse.json({ error: "Bu çalışanın kurumsal kimliğini değiştirme yetkin yok." }, { status: 403 });
    }

    const rank = (role: string) => role === "OWNER" ? 5 : role === "ADMIN" ? 4 : role === "HR" ? 3 : role === "DEPARTMENT_MANAGER" ? 2 : 1;
    if (actor.role !== "OWNER" && rank(actor.role) <= rank(target.role)) {
      return NextResponse.json({ error: "Eşit veya daha yüksek yetkili bir kullanıcının kurumsal kimliğini değiştiremezsin." }, { status: 403 });
    }

    const emailChanged = target.email.toLowerCase() !== parsed.data.email;
    const { data: updated, error: updateError } = await ctx.admin
      .from("organization_members")
      .update({
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        title: parsed.data.title || null,
        department: isDepartmentScoped(actor.role) ? actor.department : parsed.data.department || null,
      })
      .eq("id", parsed.data.memberId)
      .eq("organization_id", parsed.data.organizationId)
      .select("id,email,full_name,title,department,role,status,created_at,last_activity_at,user_id")
      .single();
    if (updateError) {
      const duplicate = updateError.code === "23505";
      return NextResponse.json({ error: duplicate ? "Bu e-posta aynı şirkette başka bir çalışana ait." : "Çalışan bilgileri güncellenemedi." }, { status: duplicate ? 409 : 500 });
    }

    // Aktif kurumsal kart varsa, yalnızca bu şirkete ait profillerde merkezi
    // kurumsal alanları eşitle. Kullanıcının olası bireysel kartına dokunma.
    if (target.user_id) {
      const { data: organization } = await ctx.admin.from("organizations").select("name").eq("id", parsed.data.organizationId).maybeSingle();
      if (organization?.name) {
        const { data: assignedCards } = await ctx.admin
          .from("physical_cards")
          .select("owner_profile_id")
          .eq("organization_id", parsed.data.organizationId)
          .eq("owner_user_id", target.user_id)
          .not("owner_profile_id", "is", null);
        const profileIds = Array.from(new Set((assignedCards || []).map((card) => card.owner_profile_id).filter(Boolean))) as string[];
        let profileUpdate = ctx.admin
          .from("card_profiles")
          .update({ name: parsed.data.fullName, role: parsed.data.title || target.role, email: parsed.data.email })
          .eq("user_id", target.user_id);
        profileUpdate = profileIds.length ? profileUpdate.in("id", profileIds) : profileUpdate.eq("company", organization.name);
        const { error: profileUpdateError } = await profileUpdate;
        if (profileUpdateError) {
          return NextResponse.json({ error: "Çalışan kaydı güncellendi ancak kurumsal kart profili eşitlenemedi." }, { status: 500 });
        }
      }
    }

    let inviteRenewed = false;
    let emailSent: boolean | null = null;
    if (emailChanged && target.status === "INVITED") {
      const raw = randomBytes(32).toString("hex");
      const hash = createHash("sha256").update(raw).digest("hex");
      const { data: resend } = await ctx.admin.rpc("resend_organization_invitation", {
        p_actor_user_id: ctx.user.id,
        p_organization_id: parsed.data.organizationId,
        p_member_id: parsed.data.memberId,
        p_token_hash: hash,
        p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      const resendResult = resend as { ok?: boolean; email?: string } | null;
      if (resendResult?.ok && resendResult.email) {
        const { data: organization } = await ctx.admin.from("organizations").select("name").eq("id", parsed.data.organizationId).single();
        const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
        const mail = await sendOrganizationInviteEmail({
          to: resendResult.email,
          inviteUrl: `${base}/kurumsal/davet?token=${raw}`,
          organizationName: organization?.name || "Şirket",
        });
        inviteRenewed = true;
        emailSent = mail.sent;
      }
    }

    return NextResponse.json({ member: updated, inviteRenewed, emailSent });
  }

  const parsed = statusPatchSchema.safeParse({ ...payload, action: payload?.action || "STATUS" });
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  const actor = await manager(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!actor) return NextResponse.json({ error: "Yetkin yok." }, { status: 403 });
  if (isDepartmentScoped(actor.role)) {
    const { data: target } = await ctx.admin.from("organization_members").select("user_id,role,department").eq("id", parsed.data.memberId).eq("organization_id", parsed.data.organizationId).maybeSingle();
    if (!target || !isOrganizationRole(target.role) || !canManageMemberInDepartment(actor.role, actor.department, target.role, target.department, target.user_id === ctx.user.id)) {
      return NextResponse.json({ error: "Yalnız kendi departmanındaki çalışanların durumunu değiştirebilirsin." }, { status: 403 });
    }
  }
  const { data, error } = await ctx.admin.rpc("change_organization_member_status", {
    p_actor_user_id: ctx.user.id,
    p_organization_id: parsed.data.organizationId,
    p_member_id: parsed.data.memberId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason || null,
  });
  const result = data as { ok?: boolean; code?: string } | null;
  if (error || !result?.ok) {
    const status = result?.code === "NOT_FOUND" ? 404 : result?.code === "FORBIDDEN" ? 403 : result?.code === "INVALID_TRANSITION" ? 409 : 500;
    const message = result?.code === "NOT_FOUND" ? "Çalışan bulunamadı." : result?.code === "FORBIDDEN" ? "Kendi hesabını veya eşit/üst yetkili bir rolü değiştiremezsin." : result?.code === "INVALID_TRANSITION" ? "Bu çalışan durumu geçişine izin verilmiyor." : "Çalışan durumu güncellenemedi.";
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = roleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz rol işlemi." }, { status: 400 });
  const actor = await manager(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!actor || isDepartmentScoped(actor.role)) return NextResponse.json({ error: "Bu rol değişikliğine yetkin yok." }, { status: 403 });
  const { data, error } = await ctx.admin.rpc("change_organization_member_role", {
    p_actor_user_id: ctx.user.id,
    p_organization_id: parsed.data.organizationId,
    p_member_id: parsed.data.memberId,
    p_role: parsed.data.role,
    p_reason: parsed.data.reason || null,
  });
  const result = data as { ok?: boolean; code?: string } | null;
  if (error || !result?.ok) {
    const status = result?.code === "NOT_FOUND" ? 404 : result?.code === "FORBIDDEN" ? 403 : result?.code === "INVALID_ROLE" ? 400 : 500;
    const message = status === 404 ? "Çalışan bulunamadı." : status === 403 ? "Bu rol değişikliğine yetkin yok." : status === 400 ? "Geçersiz rol." : "Rol güncellenemedi.";
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}
