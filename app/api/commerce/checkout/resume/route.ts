import { NextRequest, NextResponse } from "next/server";
import {
  CHECKOUT_CONTINUATION_COOKIE,
  createCheckoutContinuation,
  hashCheckoutResumeCode,
  verifyCheckoutContinuation,
} from "../../../../../lib/commerce/checkout-resume";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../../../lib/observability/system-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function clearContinuation(response: NextResponse) {
  response.cookies.set({
    name: CHECKOUT_CONTINUATION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/commerce/checkout/resume",
    maxAge: 0,
  });
  return response;
}

function setContinuation(response: NextResponse, value: string) {
  response.cookies.set({
    name: CHECKOUT_CONTINUATION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/commerce/checkout/resume",
    maxAge: 10 * 60,
  });
  return response;
}

async function exchangeResumeCode(request: NextRequest, code: string) {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(code)) {
    return noStore(NextResponse.json({ error: "Devam bağlantısının süresi dolmuş veya geçersiz." }, { status: 410 }));
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("commerce_checkout_resume_codes")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("code_hash", hashCheckoutResumeCode(code))
    .is("redeemed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("order_id")
    .maybeSingle();

  if (error) {
    void recordSystemError({
      source: "CHECKOUT_RESUME",
      errorCode: "CODE_EXCHANGE_FAILED",
      message: "Ödeme devam bağlantısı doğrulanamadı.",
    });
    return noStore(NextResponse.json({ error: "Ödeme devam bağlantısı şu anda doğrulanamıyor." }, { status: 503 }));
  }
  if (!data?.order_id) {
    return noStore(NextResponse.json({ error: "Devam bağlantısı daha önce kullanılmış, süresi dolmuş veya geçersiz." }, { status: 410 }));
  }

  const continuation = createCheckoutContinuation(data.order_id);
  if (!continuation) {
    void recordSystemError({
      source: "CHECKOUT_RESUME",
      errorCode: "CONTINUATION_SIGNING_FAILED",
      message: "Ödeme devam oturumu imzalanamadı.",
    });
    return noStore(NextResponse.json({ error: "Ödeme devam bağlantısı şu anda doğrulanamıyor." }, { status: 503 }));
  }

  const response = NextResponse.redirect(new URL("/checkout", request.url), 303);
  return noStore(setContinuation(response, continuation));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("token");
  if (code) return exchangeResumeCode(request, code);

  const continuation = request.cookies.get(CHECKOUT_CONTINUATION_COOKIE)?.value || "";
  const verified = verifyCheckoutContinuation(continuation);
  if (!verified) {
    return clearContinuation(noStore(NextResponse.json({ error: "Güvenli ödeme devamı bulunamadı." }, { status: 404 })));
  }

  const admin = getSupabaseAdminClient();
  const { data: session, error } = await admin
    .from("commerce_checkout_sessions")
    .select("order_id,draft_payload,expires_at,commerce_orders(status)")
    .eq("order_id", verified.orderId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    void recordSystemError({
      source: "CHECKOUT_RESUME",
      errorCode: "SESSION_LOOKUP_FAILED",
      message: "Ödeme taslağı yüklenemedi.",
    });
    return clearContinuation(noStore(NextResponse.json({ error: "Sipariş taslağı şu anda yüklenemiyor." }, { status: 503 })));
  }

  const order = session?.commerce_orders as { status?: string } | { status?: string }[] | null | undefined;
  const status = Array.isArray(order) ? order[0]?.status : order?.status;
  if (!session || status !== "AWAITING_PAYMENT") {
    return clearContinuation(noStore(NextResponse.json({ error: "Bu sipariş artık ödeme beklemiyor." }, { status: 409 })));
  }

  return clearContinuation(noStore(NextResponse.json({ orderId: session.order_id, draft: session.draft_payload })));
}
