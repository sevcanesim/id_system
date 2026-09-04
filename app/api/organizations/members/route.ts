import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOrganizationInviteEmail } from "../../../../lib/email/resend";
import { recordOrganizationAuditEvent } from "../../../../lib/organizations/audit";
import { getSeatBreakdown } from "../../../../lib/organizations/lifecycle";
import {
  canInviteRole,
  isOrganizationRole,
} from "../../../../lib/organizations/permissions";
import {
  getSupabaseAdminClient,
  getSupabaseAuthClient,
} from "../../../../lib/supabase/server-admin";

const createSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]).default("EMPLOYEE"),
});

const statusPatchSchema = z.object({
  action: z.literal("STATUS").default("STATUS"),
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED", "LEFT"]),
  reason: z.string().trim().max(500).optional(),
});

const identityPatchSchema = z.object({
  action: z.literal("IDENTITY"),
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  title: z.string().trim().max(120).optional().default(""),
  department: z.string().trim().max(120).optional().default(""),
});

const roleSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]),
  reason: z.string().trim().max(500).optional(),
});

type IdentityMutationResult = {
  ok?: boolean;
  code?: string;
  member?: Record<string, unknown>;
  email_changed?: boolean;
  previous_status?: string;
};

async function requestContext(request: NextRequest) {
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return null;

  const authClient = getSupabaseAuthClient();
  const { data } = await authClient.auth.getUser(accessToken);
  if (!data.user) return null;

  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function getManager(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  organizationId: string,
) {
  const { data } = await admin
    .from("organization_members")
    .select("role,status,department")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  return data && data.status === "ACTIVE" && isOrganizationRole(data.role) ? data : null;
}

async function readJson(request: NextRequest) {
  return request.json().catch(() => null);
}

export async function GET(request: NextRequest) {
  const context = await requestContext(request);
  if (!context) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });
  }

  if (request.nextUrl.searchParams.get("self") === "true") {
    const { data, error } = await context.admin
      .from("organization_members")
      .select("id,email,full_name,title,department,role,status,created_at,last_activity_at")
      .eq("organization_id", organizationId)
      .eq("user_id", context.user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Üyelik bilgisi yüklenemedi." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Bu şirkette aktif üyeliğin yok." }, { status: 404 });
    }
    return NextResponse.json({ member: data });
  }

  const actor = await getManager(context.admin, context.user.id, organizationId);
  if (!actor || !["OWNER", "ADMIN", "HR"].includes(actor.role)) {
    return NextResponse.json({ error: "Üye listesini görme yetkin yok." }, { status: 403 });
  }

  const memberColumns = "id,email,full_name,title,department,role,status,created_at,last_activity_at,user_id";
  let membersQuery = context.admin
    .from("organization_members")
    .select(memberColumns)
    .eq("organization_id", organizationId);

  let { data, error } = await membersQuery.order("created_at");

  if (error && error.code === "42703") {
    let fallbackQuery = context.admin
      .from("organization_members")
      .select("id,email,full_name,title,department,role,status,created_at,user_id")
      .eq("organization_id", organizationId);

    const fallback = await fallbackQuery.order("created_at");
    data = fallback.data?.map((member) => ({ ...member, last_activity_at: null as string | null })) ?? null;
    error = fallback.error;
  }

  if (error) {
    console.error("[organizations/members] query failed", {
      organizationId,
      code: error.code,
      message: error.message,
    });
    return NextResponse.json({ error: "Çalışanlar yüklenemedi." }, { status: 500 });
  }

  const { data: seatRows } = await context.admin
    .from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId);

  return NextResponse.json({
    members: data || [],
    seatUsage: getSeatBreakdown(seatRows || []),
    permissions: {
      canInviteAdmin: actor.role === "OWNER",
      canManageTemplates: ["OWNER", "ADMIN"].includes(actor.role),
    },
  });
}

export async function POST(request: NextRequest) {
  const context = await requestContext(request);
  if (!context) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Geçersiz bilgi." },
      { status: 400 },
    );
  }

  const actor = await getManager(context.admin, context.user.id, parsed.data.organizationId);
  if (!actor || !canInviteRole(actor.role, parsed.data.role)) {
    return NextResponse.json({ error: "Bu rol için davet oluşturma yetkin yok." }, { status: 403 });
  }
  const invitationDepartment = parsed.data.department || "";
  const { data: organization } = await context.admin
    .from("organizations")
    .select("name")
    .eq("id", parsed.data.organizationId)
    .single();

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const { data: reservation, error } = await context.admin.rpc("reserve_organization_invitation", {
    p_actor_user_id: context.user.id,
    p_organization_id: parsed.data.organizationId,
    p_email: parsed.data.email,
    p_full_name: parsed.data.fullName,
    p_title: parsed.data.title || "",
    p_department: invitationDepartment,
    p_role: parsed.data.role,
    p_token_hash: tokenHash,
    p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  const result = reservation as {
    ok?: boolean;
    code?: string;
    member?: Record<string, unknown>;
  } | null;

  if (error || !result?.ok || !result.member) {
    const status =
      result?.code === "SEAT_LIMIT" || result?.code === "DUPLICATE"
        ? 409
        : result?.code === "NO_SUBSCRIPTION" || result?.code === "FORBIDDEN"
          ? 403
          : 500;
    const message =
      result?.code === "SEAT_LIMIT"
        ? "Paket lisans sınırına ulaşıldı."
        : result?.code === "DUPLICATE"
          ? "Bu e-posta şirkette zaten kayıtlı."
          : result?.code === "NO_SUBSCRIPTION"
            ? "Aktif kurumsal abonelik bulunamadı."
            : result?.code === "FORBIDDEN"
              ? "Bu rol için davet oluşturma yetkin yok."
              : "Davet kaydı oluşturulamadı.";
    return NextResponse.json({ error: message }, { status });
  }

  const member = result.member as { id: string; email: string; [key: string]: unknown };
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const mail = await sendOrganizationInviteEmail({
    to: member.email,
    inviteUrl: `${baseUrl}/kurumsal/davet?token=${rawToken}`,
    organizationName: organization?.name || "Şirket",
  });

  await recordOrganizationAuditEvent(context.admin, {
    organizationId: parsed.data.organizationId,
    actorUserId: context.user.id,
    actorRole: actor.role,
    action: "MEMBER_INVITED",
    subjectType: "MEMBER",
    subjectId: member.id,
    summary: "Çalışan daveti oluşturuldu.",
    metadata: { role: parsed.data.role, department: invitationDepartment || null },
  });

  return NextResponse.json({ member, emailSent: mail.sent }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await requestContext(request);
  if (!context) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const payload = await readJson(request);

  if (payload?.action === "IDENTITY") {
    const parsed = identityPatchSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Geçersiz çalışan bilgisi." },
        { status: 400 },
      );
    }

    const { data, error } = await context.admin.rpc("update_organization_member_identity", {
      p_actor_user_id: context.user.id,
      p_organization_id: parsed.data.organizationId,
      p_member_id: parsed.data.memberId,
      p_full_name: parsed.data.fullName,
      p_email: parsed.data.email,
      p_title: parsed.data.title || null,
      p_department: parsed.data.department || null,
    });

    const result = data as IdentityMutationResult | null;
    if (error || !result?.ok || !result.member) {
      const status =
        result?.code === "NOT_FOUND"
          ? 404
          : result?.code === "FORBIDDEN"
            ? 403
            : result?.code === "DUPLICATE"
              ? 409
              : result?.code?.startsWith("INVALID_")
                ? 400
                : 500;
      const message =
        result?.code === "NOT_FOUND"
          ? "Çalışan bulunamadı."
          : result?.code === "FORBIDDEN"
            ? "Bu çalışanın kurumsal kimliğini değiştirme yetkin yok."
            : result?.code === "DUPLICATE"
              ? "Bu e-posta aynı şirkette başka bir çalışana ait."
              : result?.code?.startsWith("INVALID_")
                ? "Çalışan bilgileri geçersiz."
                : "Çalışan bilgileri güncellenemedi.";
      return NextResponse.json({ error: message }, { status });
    }

    let inviteRenewed = false;
    let emailSent: boolean | null = null;

    if (result.email_changed && result.previous_status === "INVITED") {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const { data: resend } = await context.admin.rpc("resend_organization_invitation", {
        p_actor_user_id: context.user.id,
        p_organization_id: parsed.data.organizationId,
        p_member_id: parsed.data.memberId,
        p_token_hash: tokenHash,
        p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      const resendResult = resend as { ok?: boolean; email?: string } | null;

      if (resendResult?.ok && resendResult.email) {
        const { data: organization } = await context.admin
          .from("organizations")
          .select("name")
          .eq("id", parsed.data.organizationId)
          .single();
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
        const mail = await sendOrganizationInviteEmail({
          to: resendResult.email,
          inviteUrl: `${baseUrl}/kurumsal/davet?token=${rawToken}`,
          organizationName: organization?.name || "Şirket",
        });
        inviteRenewed = true;
        emailSent = mail.sent;
      }
    }

    const actor = await getManager(context.admin, context.user.id, parsed.data.organizationId);
    if (actor) {
      await recordOrganizationAuditEvent(context.admin, {
        organizationId: parsed.data.organizationId,
        actorUserId: context.user.id,
        actorRole: actor.role,
        action: "MEMBER_IDENTITY_UPDATED",
        subjectType: "MEMBER",
        subjectId: parsed.data.memberId,
        summary: "Çalışan kimlik bilgileri güncellendi.",
        metadata: { invitationRenewed: inviteRenewed },
      });
    }

    return NextResponse.json({ member: result.member, inviteRenewed, emailSent });
  }

  const parsed = statusPatchSchema.safeParse({
    ...payload,
    action: payload?.action || "STATUS",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  }

  const actor = await getManager(context.admin, context.user.id, parsed.data.organizationId);
  if (!actor) return NextResponse.json({ error: "Yetkin yok." }, { status: 403 });

  const { data, error } = await context.admin.rpc("change_organization_member_status", {
    p_actor_user_id: context.user.id,
    p_organization_id: parsed.data.organizationId,
    p_member_id: parsed.data.memberId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason || null,
  });
  const result = data as { ok?: boolean; code?: string } | null;

  if (error || !result?.ok) {
    const status =
      result?.code === "NOT_FOUND"
        ? 404
        : result?.code === "FORBIDDEN"
          ? 403
          : result?.code === "INVALID_TRANSITION"
            ? 409
            : 500;
    const message =
      result?.code === "NOT_FOUND"
        ? "Çalışan bulunamadı."
        : result?.code === "FORBIDDEN"
          ? "Kendi hesabını veya eşit/üst yetkili bir rolü değiştiremezsin."
          : result?.code === "INVALID_TRANSITION"
            ? "Bu çalışan durumu geçişine izin verilmiyor."
            : "Çalışan durumu güncellenemedi.";
    return NextResponse.json({ error: message }, { status });
  }

  await recordOrganizationAuditEvent(context.admin, {
    organizationId: parsed.data.organizationId,
    actorUserId: context.user.id,
    actorRole: actor.role,
    action: "MEMBER_STATUS_CHANGED",
    subjectType: "MEMBER",
    subjectId: parsed.data.memberId,
    summary: "Çalışan durumu güncellendi.",
    metadata: { status: parsed.data.status, reasonProvided: Boolean(parsed.data.reason) },
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const context = await requestContext(request);
  if (!context) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const parsed = roleSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz rol işlemi." }, { status: 400 });
  }

  const actor = await getManager(context.admin, context.user.id, parsed.data.organizationId);
  if (!actor) {
    return NextResponse.json({ error: "Bu rol değişikliğine yetkin yok." }, { status: 403 });
  }

  const { data, error } = await context.admin.rpc("change_organization_member_role", {
    p_actor_user_id: context.user.id,
    p_organization_id: parsed.data.organizationId,
    p_member_id: parsed.data.memberId,
    p_role: parsed.data.role,
    p_reason: parsed.data.reason || null,
  });
  const result = data as { ok?: boolean; code?: string } | null;

  if (error || !result?.ok) {
    const status =
      result?.code === "NOT_FOUND"
        ? 404
        : result?.code === "FORBIDDEN"
          ? 403
          : result?.code === "INVALID_ROLE"
            ? 400
            : 500;
    const message =
      status === 404
        ? "Çalışan bulunamadı."
        : status === 403
          ? "Bu rol değişikliğine yetkin yok."
          : status === 400
            ? "Geçersiz rol."
            : "Rol güncellenemedi.";
    return NextResponse.json({ error: message }, { status });
  }

  await recordOrganizationAuditEvent(context.admin, {
    organizationId: parsed.data.organizationId,
    actorUserId: context.user.id,
    actorRole: actor.role,
    action: "MEMBER_ROLE_CHANGED",
    subjectType: "MEMBER",
    subjectId: parsed.data.memberId,
    summary: "Çalışan rolü güncellendi.",
    metadata: { role: parsed.data.role, reasonProvided: Boolean(parsed.data.reason) },
  });

  return NextResponse.json({ ok: true });
}
