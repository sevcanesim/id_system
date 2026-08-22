import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOrganizationInviteEmail } from "../../../../../lib/email/resend";
import { canInviteRole, isDepartmentScoped, isOrganizationRole } from "../../../../../lib/organizations/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../../lib/supabase/server-admin";
import { BULK_INVITE_MAX_ROWS } from "../../../../../lib/organizations/bulk-invite";
import { createHash, randomBytes } from "crypto";

// CSV toplu çalışan davet ucu. CSV'nin kendisi ayrıştırılmaz (o iş
// tarayıcıda lib/organizations/bulk-invite.ts ile önizleme için yapılır);
// bu uç yalnızca zaten yapılandırılmış satırları kabul eder ve her birini,
// tekil davet akışıyla (POST /api/organizations/members) AYNI
// reserve_organization_invitation RPC'si üzerinden — aynı koltuk kotası,
// yinelenen e-posta ve rol yetkisi kontrolleriyle — tek tek işler. Kısmi
// başarı beklenir: bir satırın başarısız olması diğerlerini durdurmaz.

const rowSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional().default(""),
  department: z.string().trim().max(120).optional().default(""),
  role: z.enum(["ADMIN", "HR", "DEPARTMENT_MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
});

const schema = z.object({
  organizationId: z.string().uuid(),
  rows: z.array(rowSchema).min(1, "En az bir satır gerekli.").max(BULK_INVITE_MAX_ROWS, `Tek seferde en fazla ${BULK_INVITE_MAX_ROWS} satır işlenebilir.`),
});

type RowResult = {
  line?: number;
  email: string;
  status: "created" | "error";
  error?: string;
  emailSent?: boolean;
  memberId?: string;
};

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

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz istek." }, { status: 400 });

  const actor = await manager(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!actor) return NextResponse.json({ error: "Bu şirkette çalışan davet etme yetkin yok." }, { status: 403 });
  if (isDepartmentScoped(actor.role) && !actor.department) return NextResponse.json({ error: "Departman yöneticisine departman atanmamış." }, { status: 409 });

  const { data: org } = await ctx.admin.from("organizations").select("name").eq("id", parsed.data.organizationId).single();
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

  const results: RowResult[] = [];
  // Satırlar SIRAYLA işlenir (paralel değil) — reserve_organization_invitation
  // koltuk kotasını satır bazında kontrol ediyor; paralel çağrılar yarış
  // durumuna ve kotanın yanlışlıkla aşılmasına yol açabilir.
  for (const row of parsed.data.rows) {
    if (!canInviteRole(actor.role, row.role)) {
      results.push({ email: row.email, status: "error", error: "Bu rol için davet oluşturma yetkin yok." });
      continue;
    }
    const invitationDepartment = isDepartmentScoped(actor.role) ? actor.department || "" : row.department || "";
    const raw = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(raw).digest("hex");
    const { data: reservation, error } = await ctx.admin.rpc("reserve_organization_invitation", {
      p_actor_user_id: ctx.user.id,
      p_organization_id: parsed.data.organizationId,
      p_email: row.email,
      p_full_name: row.fullName,
      p_title: row.title || "",
      p_department: invitationDepartment,
      p_role: row.role,
      p_token_hash: hash,
      p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    const result = reservation as { ok?: boolean; code?: string; member?: Record<string, unknown> } | null;
    if (error || !result?.ok || !result.member) {
      const message =
        result?.code === "SEAT_LIMIT"
          ? "Lisans kotası doldu."
          : result?.code === "DUPLICATE"
            ? "Bu e-posta şirkette zaten kayıtlı."
            : result?.code === "NO_SUBSCRIPTION"
              ? "Aktif kurumsal abonelik bulunamadı."
              : result?.code === "FORBIDDEN"
                ? "Bu rol için davet oluşturma yetkin yok."
                : "Davet kaydı oluşturulamadı.";
      results.push({ email: row.email, status: "error", error: message });
      // Kota dolduysa kalan satırlar da aynı sebeple başarısız olacak;
      // gereksiz RPC çağrısı yapmadan erken çık ama şimdiye kadarki
      // sonuçları döndür.
      if (result?.code === "SEAT_LIMIT") {
        for (const remaining of parsed.data.rows.slice(parsed.data.rows.indexOf(row) + 1)) {
          results.push({ email: remaining.email, status: "error", error: "Lisans kotası doldu (önceki satırlar nedeniyle işlenmedi)." });
        }
        break;
      }
      continue;
    }
    const member = result.member as { id: string; email: string };
    const mail = await sendOrganizationInviteEmail({
      to: member.email,
      inviteUrl: `${base}/kurumsal/davet?token=${raw}`,
      organizationName: org?.name || "Şirket",
    });
    results.push({ email: row.email, status: "created", emailSent: mail.sent, memberId: member.id });
  }

  const created = results.filter((item) => item.status === "created").length;
  const failed = results.filter((item) => item.status === "error").length;
  return NextResponse.json({ results, created, failed }, { status: created > 0 ? 201 : 200 });
}
