import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOrganizationInviteEmail } from "../../../../lib/email/resend";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { transientTokenUrl } from "../../../../lib/security/transient-link";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("RESEND"), organizationId: z.string().uuid(), memberId: z.string().uuid() }),
  z.object({ action: z.literal("REVOKE"), organizationId: z.string().uuid(), memberId: z.string().uuid(), reason: z.string().trim().max(500).optional() }),
]);

async function actor(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  return identity?.user ?? null;
}

export async function POST(request: NextRequest) {
  const user = await actor(request);
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz davet işlemi." }, { status: 400 });
  const admin = getSupabaseAdminClient();

  if (parsed.data.action === "REVOKE") {
    const { data, error } = await admin.rpc("revoke_organization_invitation", {
      p_actor_user_id: user.id,
      p_organization_id: parsed.data.organizationId,
      p_member_id: parsed.data.memberId,
      p_reason: parsed.data.reason || null,
    });
    const result = data as { ok?: boolean; code?: string } | null;
    if (error || !result?.ok) {
      const status = result?.code === "NOT_FOUND" ? 404 : result?.code === "FORBIDDEN" ? 403 : 500;
      return NextResponse.json({ error: status === 404 ? "Davet bulunamadı." : status === 403 ? "Bu daveti iptal etme yetkin yok." : "Davet iptal edilemedi." }, { status });
    }
    return NextResponse.json({ ok: true });
  }

  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  const { data, error } = await admin.rpc("resend_organization_invitation", {
    p_actor_user_id: user.id,
    p_organization_id: parsed.data.organizationId,
    p_member_id: parsed.data.memberId,
    p_token_hash: hash,
    p_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  const result = data as { ok?: boolean; code?: string; email?: string } | null;
  if (error || !result?.ok || !result.email) {
    const status = result?.code === "NOT_FOUND" ? 404 : result?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 404 ? "Davet bulunamadı." : status === 403 ? "Bu daveti yeniden gönderme yetkin yok." : "Davet yenilenemedi." }, { status });
  }
  const { data: organization } = await admin.from("organizations").select("name").eq("id", parsed.data.organizationId).single();
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const mail = await sendOrganizationInviteEmail({
    to: result.email,
    inviteUrl: transientTokenUrl(base, "/kurumsal/davet", raw),
    organizationName: organization?.name || "Şirket",
  });
  if (!mail.sent) return NextResponse.json({ ok: true, emailSent: false, warning: "Davet yenilendi ancak e-posta gönderilemedi." }, { status: 202 });
  return NextResponse.json({ ok: true, emailSent: true });
}
