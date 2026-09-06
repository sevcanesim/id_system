import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestIdentity } from "../../../../../lib/auth/request-identity";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../../lib/observability/system-errors";

const schema = z.object({ token: z.string().min(20) });

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  return response;
}

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return noStore(NextResponse.json({ error: "Önce giriş yapmalısın." }, { status: 401 }));

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStore(NextResponse.json({ error: "Davet bağlantısı geçersiz." }, { status: 400 }));

  const admin = getSupabaseAdminClient();
  const hash = createHash("sha256").update(parsed.data.token).digest("hex");
  const { data: result, error } = await admin.rpc("accept_organization_invite", {
    p_token_hash: hash,
    p_user_id: identity.user.id,
    p_user_email: identity.user.email || "",
  });
  if (error) {
    void recordSystemError({
      source: "ORGANIZATION_INVITE",
      errorCode: "INVITE_ACCEPT_FAILED",
      message: "Kurumsal davet kabul edilemedi.",
      userId: identity.user.id,
    });
    return noStore(NextResponse.json({ error: "Davet kabul edilemedi." }, { status: 500 }));
  }

  const payload = result as { ok?: boolean; code?: string; member_id?: string; organization_id?: string } | null;
  if (!payload?.ok) {
    if (payload?.code === "EMAIL_MISMATCH") return noStore(NextResponse.json({ error: "Bu davet başka bir e-posta için oluşturulmuş." }, { status: 403 }));
    if (payload?.code === "MEMBER_UNAVAILABLE") return noStore(NextResponse.json({ error: "Davet edilen üyelik artık kullanılamıyor." }, { status: 409 }));
    return noStore(NextResponse.json({ error: "Davet süresi dolmuş veya kullanılmış." }, { status: 410 }));
  }

  return noStore(NextResponse.json({ ok: true, memberId: payload.member_id || null, organizationId: payload.organization_id || null }));
}
