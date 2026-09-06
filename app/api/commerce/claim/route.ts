import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { publicError } from "../../../../lib/errors";
import { recordSystemError } from "../../../../lib/observability/system-errors";

const schema = z.object({ token: z.string().min(20) });
type ClaimResult = { ok?: boolean; code?: string; corporate?: boolean };

function claimError(code?: string) {
  if (code === "TOKEN_INVALID") return { status: 410, error: "Aktivasyon bağlantısının süresi dolmuş veya kullanılmış." };
  if (code === "ORDER_NOT_PAID") return { status: 404, error: "Ödenmiş sipariş bulunamadı." };
  if (code === "ACTIVATION_EXPIRED") return { status: 410, error: "Bu siparişin aktivasyon süresi sona ermiş. E-posta ile iletişime geçebilirsin." };
  if (code === "ORDER_ALREADY_CLAIMED") return { status: 409, error: "Sipariş zaten bir hesaba bağlı." };
  if (code === "EMAIL_MISMATCH") return { status: 403, error: "Sipariş e-postası giriş yaptığın hesapla eşleşmiyor." };
  return { status: 500, error: "Sipariş hesaba bağlanamadı." };
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.getUser(accessToken);
    if (error || !data.user?.email) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz aktivasyon bağlantısı." }, { status: 400 });

    const admin = getSupabaseAdminClient();
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const { data: result, error: claimFailure } = await admin.rpc("claim_commerce_order_activation", {
      p_token_hash: tokenHash,
      p_user_id: data.user.id,
      p_user_email: data.user.email,
    });
    if (claimFailure || !(result as ClaimResult | null)?.ok) {
      const mapped = claimError((result as ClaimResult | null)?.code);
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    return NextResponse.json({ ok: true, corporate: Boolean((result as ClaimResult | null)?.corporate) });
  } catch {
    void recordSystemError({
      source: "COMMERCE_CLAIM",
      errorCode: "ACTIVATION_CLAIM_FAILED",
      message: "Sipariş aktivasyon bağlantısı hesaba bağlanamadı.",
    });
    return NextResponse.json(publicError("ACTIVATION_FAILED"), { status: 500 });
  }
}
