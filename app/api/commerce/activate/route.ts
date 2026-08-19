import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { publicError } from "../../../../lib/errors";

const schema = z.object({ token: z.string().min(20), email: z.string().email(), password: z.string().min(8).max(72) });

type ClaimResult = { ok?: boolean; code?: string };

function claimError(code?: string) {
  if (code === "TOKEN_INVALID") return { status: 410, error: "Aktivasyon bağlantısının süresi dolmuş veya daha önce kullanılmış." };
  if (code === "ORDER_NOT_PAID") return { status: 404, error: "Ödenmiş sipariş bulunamadı." };
  if (code === "ACTIVATION_EXPIRED") return { status: 410, error: "Bu siparişin aktivasyon süresi sona ermiş. E-posta ile iletişime geçebilirsin." };
  if (code === "ORDER_ALREADY_CLAIMED") return { status: 409, error: "Bu sipariş zaten bir hesaba bağlanmış." };
  if (code === "EMAIL_MISMATCH") return { status: 400, error: "E-posta sipariş bilgisiyle eşleşmiyor." };
  return { status: 500, error: "Aktivasyon tamamlanamadı." };
}

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz bilgi." }, { status: 400 });

    const admin = getSupabaseAdminClient();
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const { data: activation } = await admin
      .from("activation_tokens")
      .select("id,expires_at,used_at,invalidated_at,commerce_orders!inner(status,user_id,guest_email,activation_deadline_at)")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    const order = activation?.commerce_orders as { status?: string; user_id?: string | null; guest_email?: string | null; activation_deadline_at?: string | null } | null;
    const now = Date.now();
    const tokenUsable = Boolean(
      activation &&
      !activation.used_at &&
      !activation.invalidated_at &&
      new Date(activation.expires_at).getTime() > now &&
      order?.status === "PAID" &&
      !order.user_id &&
      (!order.activation_deadline_at || new Date(order.activation_deadline_at).getTime() > now) &&
      order.guest_email?.toLowerCase() === parsed.data.email.toLowerCase()
    );
    if (!tokenUsable) {
      return NextResponse.json({ error: "Aktivasyon kodu veya e-posta doğrulanamadı." }, { status: 410 });
    }

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
    if (userError || !userData.user) {
      return NextResponse.json({
        error: userError?.message?.toLowerCase().includes("already")
          ? "Bu e-posta zaten kayıtlı. Mevcut hesabım seçeneğini kullan."
          : "Hesap oluşturulamadı.",
      }, { status: 409 });
    }
    createdUserId = userData.user.id;

    const { data: result, error: claimFailure } = await admin.rpc("claim_commerce_order_activation", {
      p_token_hash: tokenHash,
      p_user_id: userData.user.id,
      p_user_email: parsed.data.email,
    });
    if (claimFailure || !(result as ClaimResult | null)?.ok) {
      await admin.auth.admin.deleteUser(userData.user.id);
      createdUserId = null;
      const mapped = claimError((result as ClaimResult | null)?.code);
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (createdUserId) {
      try { await getSupabaseAdminClient().auth.admin.deleteUser(createdUserId); } catch { /* cleanup best effort */ }
    }
    console.error("commerce activation error", error);
    return NextResponse.json(publicError("ACTIVATION_FAILED"), { status: 500 });
  }
}
