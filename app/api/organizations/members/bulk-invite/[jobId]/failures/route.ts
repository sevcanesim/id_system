import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, readSessionCookie } from "../../../../../../../lib/auth/http-only-session";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../../../../lib/supabase/server-admin";

const MANAGEMENT_ROLES = new Set(["OWNER", "ADMIN", "HR"]);

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

async function authenticatedUser(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const accessToken = bearer || readSessionCookie(request, ACCESS_COOKIE) || "";
  if (!accessToken) return null;
  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(accessToken);
  return error ? null : data.user ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { jobId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    return NextResponse.json({ error: "Geçersiz işlem kimliği." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: job } = await admin
    .from("organization_invite_jobs")
    .select("id,organization_id,actor_user_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Toplu davet işlemi bulunamadı." }, { status: 404 });

  if (job.actor_user_id !== user.id) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("role,status")
      .eq("organization_id", job.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || membership.status !== "ACTIVE" || !MANAGEMENT_ROLES.has(String(membership.role))) {
      return NextResponse.json({ error: "Bu raporu indirme yetkin yok." }, { status: 403 });
    }
  }

  const { data: rows, error } = await admin
    .from("organization_invite_logs")
    .select("row_number,email,error_code,error_message,email_sent,result_status")
    .eq("job_id", jobId)
    .or("result_status.eq.ERROR,email_sent.eq.false")
    .order("row_number", { ascending: true });
  if (error) return NextResponse.json({ error: "Başarısız kayıt raporu hazırlanamadı." }, { status: 500 });

  const csvRows = [
    ["Satır", "E-posta", "Hata Kodu", "Açıklama"],
    ...(rows ?? []).map((row) => [
      row.row_number,
      row.email,
      row.error_code || (row.email_sent === false ? "EMAIL_NOT_SENT" : ""),
      row.error_message || (row.email_sent === false ? "Davet oluşturuldu ancak e-posta gönderilemedi." : ""),
    ]),
  ];
  const csv = `\uFEFF${csvRows.map((row) => row.map(csvCell).join(",")).join("\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yenomi-bulk-invite-failures-${jobId.slice(0, 8)}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
