import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../../lib/observability/system-errors";

const schema = z.object({ token: z.string().min(20) });

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return NextResponse.json({ error: "Önce giriş yapmalısın." }, { status: 401 });

  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(bearer);
  if (!data.user) return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Davet bağlantısı geçersiz." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const hash = createHash("sha256").update(parsed.data.token).digest("hex");
  const { data: result, error } = await admin.rpc("accept_organization_invite", {
    p_token_hash: hash,
    p_user_id: data.user.id,
    p_user_email: data.user.email || "",
  });
  if (error) {
    void recordSystemError({
      source: "ORGANIZATION_INVITE",
      errorCode: "INVITE_ACCEPT_FAILED",
      message: "Kurumsal davet kabul edilemedi.",
      userId: data.user.id,
    });
    return NextResponse.json({ error: "Davet kabul edilemedi." }, { status: 500 });
  }

  const payload = result as { ok?: boolean; code?: string; member_id?: string; organization_id?: string } | null;
  if (!payload?.ok) {
    if (payload?.code === "EMAIL_MISMATCH") return NextResponse.json({ error: "Bu davet başka bir e-posta için oluşturulmuş." }, { status: 403 });
    if (payload?.code === "MEMBER_UNAVAILABLE") return NextResponse.json({ error: "Davet edilen üyelik artık kullanılamıyor." }, { status: 409 });
    return NextResponse.json({ error: "Davet süresi dolmuş veya kullanılmış." }, { status: 410 });
  }

  return NextResponse.json({ ok: true, memberId: payload.member_id || null, organizationId: payload.organization_id || null });
}
