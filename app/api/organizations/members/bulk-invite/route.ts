import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOrganizationInviteEmail } from "../../../../../lib/email/resend";
import {
  BULK_INVITE_MAX_ROWS,
  summarizeBulkInviteResults,
} from "../../../../../lib/organizations/bulk-invite";
import { canInviteRole, isOrganizationRole } from "../../../../../lib/organizations/permissions";
import { recordSystemError } from "../../../../../lib/observability/system-errors";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../../lib/supabase/server-admin";

const rowSchema = z.object({
  line: z.number().int().positive().optional(),
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional().default(""),
  department: z.string().trim().max(120).optional().default(""),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]).default("EMPLOYEE"),
});

const schema = z.object({
  organizationId: z.string().uuid(),
  rows: z.array(rowSchema).min(1, "En az bir satır gerekli.").max(
    BULK_INVITE_MAX_ROWS,
    `Tek seferde en fazla ${BULK_INVITE_MAX_ROWS} satır işlenebilir.`,
  ),
});

type RowResult = {
  line?: number;
  email: string;
  status: "created" | "error";
  error?: string;
  errorCode?: string;
  emailSent?: boolean;
  memberId?: string;
};

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function manager(admin: AdminClient, userId: string, organizationId: string) {
  const { data } = await admin
    .from("organization_members")
    .select("role,status,department")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data && data.status === "ACTIVE" && isOrganizationRole(data.role) ? data : null;
}

function reservationError(code?: string) {
  if (code === "SEAT_LIMIT") return "Lisans kotası doldu.";
  if (code === "DUPLICATE") return "Bu e-posta şirkette zaten kayıtlı.";
  if (code === "NO_SUBSCRIPTION") return "Aktif kurumsal abonelik bulunamadı.";
  if (code === "FORBIDDEN") return "Bu rol için davet oluşturma yetkin yok.";
  return "Davet kaydı oluşturulamadı.";
}

async function persistRowLog(
  admin: AdminClient,
  jobId: string,
  rowNumber: number,
  result: RowResult,
) {
  const payload = {
    job_id: jobId,
    row_number: rowNumber,
    email: result.email,
    result_status: result.status === "created" ? "CREATED" : "ERROR",
    error_code: result.errorCode || null,
    error_message: result.error || null,
    member_id: result.memberId || null,
    email_sent: typeof result.emailSent === "boolean" ? result.emailSent : null,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await admin.from("organization_invite_logs").upsert(payload, {
      onConflict: "job_id,row_number",
    });
    if (!error) return true;
    if (attempt === 1) {
      void recordSystemError({
        source: "BULK_INVITE",
        errorCode: "ROW_AUDIT_PERSIST_FAILED",
        message: "Toplu davet satır denetim kaydı yazılamadı.",
        details: { rowNumber },
      });
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz istek." }, { status: 400 });
  }

  const actor = await manager(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!actor) return NextResponse.json({ error: "Bu şirkette çalışan davet etme yetkin yok." }, { status: 403 });
  const { data: job, error: jobError } = await ctx.admin
    .from("organization_invite_jobs")
    .insert({
      organization_id: parsed.data.organizationId,
      actor_user_id: ctx.user.id,
      total_rows: parsed.data.rows.length,
      status: "RUNNING",
    })
    .select("id")
    .single();
  if (jobError || !job) {
    void recordSystemError({
      source: "BULK_INVITE",
      errorCode: "JOB_CREATION_FAILED",
      message: "Toplu davet iş kaydı oluşturulamadı.",
      organizationId: parsed.data.organizationId,
      userId: ctx.user.id,
    });
    return NextResponse.json({ error: "Toplu davet işlemi güvenli şekilde başlatılamadı." }, { status: 503 });
  }

  const { data: org } = await ctx.admin
    .from("organizations")
    .select("name")
    .eq("id", parsed.data.organizationId)
    .single();
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const results: RowResult[] = [];
  let auditHealthy = true;

  for (let index = 0; index < parsed.data.rows.length; index += 1) {
    const row = parsed.data.rows[index];
    const rowNumber = row.line ?? index + 2;

    if (!canInviteRole(actor.role, row.role)) {
      const result: RowResult = {
        line: rowNumber,
        email: row.email,
        status: "error",
        errorCode: "FORBIDDEN",
        error: "Bu rol için davet oluşturma yetkin yok.",
      };
      results.push(result);
      auditHealthy = (await persistRowLog(ctx.admin, job.id, rowNumber, result)) && auditHealthy;
      continue;
    }

    const invitationDepartment = row.department;
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
    const reserved = reservation as { ok?: boolean; code?: string; member?: Record<string, unknown> } | null;

    if (error || !reserved?.ok || !reserved.member) {
      const code = reserved?.code || (error ? "RPC_ERROR" : "UNKNOWN");
      const result: RowResult = {
        line: rowNumber,
        email: row.email,
        status: "error",
        errorCode: code,
        error: reservationError(reserved?.code),
      };
      results.push(result);
      auditHealthy = (await persistRowLog(ctx.admin, job.id, rowNumber, result)) && auditHealthy;

      if (reserved?.code === "SEAT_LIMIT") {
        for (let remainingIndex = index + 1; remainingIndex < parsed.data.rows.length; remainingIndex += 1) {
          const remaining = parsed.data.rows[remainingIndex];
          const remainingRowNumber = remaining.line ?? remainingIndex + 2;
          const skipped: RowResult = {
            line: remainingRowNumber,
            email: remaining.email,
            status: "error",
            errorCode: "SEAT_LIMIT_SKIPPED",
            error: "Lisans kotası doldu (önceki satırlar nedeniyle işlenmedi).",
          };
          results.push(skipped);
          auditHealthy = (await persistRowLog(ctx.admin, job.id, remainingRowNumber, skipped)) && auditHealthy;
        }
        break;
      }
      continue;
    }

    const member = reserved.member as { id: string; email: string };
    const mail = await sendOrganizationInviteEmail({
      to: member.email,
      inviteUrl: `${base}/kurumsal/davet?token=${raw}`,
      organizationName: org?.name || "Şirket",
    });
    const result: RowResult = {
      line: rowNumber,
      email: row.email,
      status: "created",
      emailSent: mail.sent,
      memberId: member.id,
      ...(mail.sent ? {} : { errorCode: "EMAIL_NOT_SENT", error: "Davet oluşturuldu ancak e-posta gönderilemedi." }),
    };
    results.push(result);
    auditHealthy = (await persistRowLog(ctx.admin, job.id, rowNumber, result)) && auditHealthy;
  }

  const { created, failed, mailFailed } = summarizeBulkInviteResults(results);
  const finalStatus = auditHealthy ? "COMPLETED" : "COMPLETED_WITH_AUDIT_ERRORS";
  const { error: finalizeError } = await ctx.admin
    .from("organization_invite_jobs")
    .update({
      status: finalStatus,
      created_count: created,
      failed_count: failed,
      mail_failed_count: mailFailed,
      completed_at: new Date().toISOString(),
      error_message: auditHealthy ? null : "Bir veya daha fazla satır audit kaydı iki denemede de yazılamadı.",
    })
    .eq("id", job.id);

  if (finalizeError) {
    void recordSystemError({
      source: "BULK_INVITE",
      errorCode: "JOB_FINALIZATION_FAILED",
      message: "Toplu davet iş kaydı tamamlanamadı.",
      organizationId: parsed.data.organizationId,
      userId: ctx.user.id,
    });
  }

  return NextResponse.json(
    {
      jobId: job.id,
      results,
      created,
      failed,
      mailFailed,
      auditHealthy: auditHealthy && !finalizeError,
      failedRowsCsvUrl: `/api/organizations/members/bulk-invite/${job.id}/failures`,
    },
    { status: created > 0 ? 201 : 200 },
  );
}
