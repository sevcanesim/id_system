import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

const schema = z.object({ organizationId: z.string().uuid(), newOwnerMemberId: z.string().uuid(), reason: z.string().trim().max(500).optional() });

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz sahiplik devri." }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const { data: resultData, error } = await admin.rpc("transfer_organization_ownership", {
    p_actor_user_id: data.user.id, p_organization_id: parsed.data.organizationId,
    p_new_owner_member_id: parsed.data.newOwnerMemberId, p_reason: parsed.data.reason || null,
  });
  const result = resultData as { ok?: boolean; code?: string } | null;
  if (error || !result?.ok) {
    const status = result?.code === "NOT_FOUND" ? 404 : result?.code === "INVALID_TARGET" ? 409 : result?.code === "FORBIDDEN" ? 403 : 500;
    const message = status === 404 ? "Yeni şirket sahibi bulunamadı." : status === 409 ? "Şirket sahibi yalnız aktif ve hesabını kabul etmiş bir çalışana devredilebilir." : status === 403 ? "Şirket sahipliğini yalnız mevcut şirket sahibi devredebilir." : "Şirket sahipliği devredilemedi.";
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}
