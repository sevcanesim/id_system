import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";
import { publicError } from "../../../../lib/errors";

const schema = z.object({ token: z.string().min(20), email: z.string().email(), password: z.string().min(8).max(72) });

type ClaimResult = { ok?: boolean; code?: string; corporate?: boolean };

function claimError(code?: string) {
  if (code === "TOKEN_INVALID") return { status: 410, error: "Aktivasyon bağlantısının süresi dolmuş veya daha önce kullanılmış." };
  if (code === "ORDER_NOT_PAID") return { status: 404, error: "Ödenmiş sipariş bulunamadı." };
  if (code === "ACTIVATION_EXPIRED") return { status: 410, error: "Bu siparişin aktivasyon süresi sona ermiş. E-posta ile iletişime geçebilirsin." };
  if (code === "ORDER_ALREADY_CLAIMED") return { status: 409, error: "Bu sipariş zaten bir hesaba bağlanmış." };
  if (code === "EMAIL_MISMATCH") return { status: 400, error: "E-posta sipariş bilgisiyle eşleşmiyor." };
  if (code === "ACTIVATION_IN_PROGRESS") return { status: 409, error: "Bu aktivasyon başka bir işlemde tamamlanıyor. Kısa bir süre sonra tekrar dene." };
  if (code === "ACTIVATION_RESERVATION_EXPIRED") return { status: 409, error: "Aktivasyon işlemi zaman aşımına uğradı. Tekrar deneyebilirsin." };
  if (code === "ACTIVATION_RESERVATION_INVALID") return { status: 409, error: "Aktivasyon oturumu geçersiz. İşlemi yeniden başlat." };
  return { status: 500, error: "Aktivasyon tamamlanamadı." };
}

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;
  let tokenHash: string | null = null;
  let reservationId: string | null = null;

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz bilgi." }, { status: 400 });

    const admin = getSupabaseAdminClient();
    tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    reservationId = randomUUID();

    // Validate and lock all database-side activation rules before crossing the
    // Supabase Auth boundary. A short reservation prevents concurrent account
    // creation attempts for the same paid order.
    const { data: reservation, error: reservationFailure } = await admin.rpc("reserve_commerce_order_activation", {
      p_token_hash: tokenHash,
      p_user_email: parsed.data.email,
      p_reservation_id: reservationId,
    });
    const reserved = reservation as ClaimResult | null;
    if (reservationFailure || !reserved?.ok) {
      const mapped = claimError(reserved?.code);
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
    if (userError || !userData.user) {
      await admin.rpc("release_commerce_order_activation_reservation", {
        p_token_hash: tokenHash,
        p_reservation_id: reservationId,
      });
      reservationId = null;
      return NextResponse.json({
        error: userError?.message?.toLowerCase().includes("already")
          ? "Bu e-posta zaten kayıtlı. Mevcut hesabım seçeneğini kullan."
          : "Hesap oluşturulamadı.",
      }, { status: 409 });
    }
    createdUserId = userData.user.id;

    const finalizeArgs = {
      p_token_hash: tokenHash,
      p_reservation_id: reservationId,
      p_user_id: userData.user.id,
      p_user_email: parsed.data.email,
    };
    let { data: result, error: claimFailure } = await admin.rpc("finalize_commerce_order_activation_registration", finalizeArgs);

    // If the database committed but the response was lost, a second call is
    // safe: the finalizer treats the same user/order pair as idempotent success.
    if (claimFailure) {
      const retry = await admin.rpc("finalize_commerce_order_activation_registration", finalizeArgs);
      result = retry.data;
      claimFailure = retry.error;
    }

    if (claimFailure || !(result as ClaimResult | null)?.ok) {
      let deleted = false;
      try {
        const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
        deleted = !deleteError;
        if (deleteError) console.error("activation auth cleanup failed", deleteError.message);
      } catch (cleanupError) {
        console.error("activation auth cleanup failed", cleanupError instanceof Error ? cleanupError.message : "unknown");
      }

      // Only release the DB reservation when the compensating Auth delete is
      // confirmed. If cleanup failed, the reservation remains until its TTL so
      // concurrent retries cannot create a second account while reconciliation
      // or operator intervention resolves the orphan candidate.
      if (deleted) {
        await admin.rpc("release_commerce_order_activation_reservation", {
          p_token_hash: tokenHash,
          p_reservation_id: reservationId,
        });
        createdUserId = null;
        reservationId = null;
      }

      const mapped = claimError((result as ClaimResult | null)?.code);
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    createdUserId = null;
    reservationId = null;
    return NextResponse.json({ ok: true, corporate: Boolean((result as ClaimResult | null)?.corporate) });
  } catch (error) {
    if (tokenHash && reservationId) {
      const admin = getSupabaseAdminClient();
      let canRelease = !createdUserId;
      if (createdUserId) {
        try {
          const { error: deleteError } = await admin.auth.admin.deleteUser(createdUserId);
          canRelease = !deleteError;
          if (deleteError) console.error("activation auth cleanup failed", deleteError.message);
        } catch (cleanupError) {
          console.error("activation auth cleanup failed", cleanupError instanceof Error ? cleanupError.message : "unknown");
        }
      }
      if (canRelease) {
        try {
          await admin.rpc("release_commerce_order_activation_reservation", {
            p_token_hash: tokenHash,
            p_reservation_id: reservationId,
          });
        } catch { /* reservation expires automatically */ }
      }
    }
    console.error("commerce activation error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(publicError("ACTIVATION_FAILED"), { status: 500 });
  }
}
