import { NextRequest, NextResponse } from "next/server";
import { publicError } from "../errors";
import { consumeDistributedRateLimit, requestIp } from "./rate-limit";

export async function limitAuthLoginIp(ip: string) {
  return consumeDistributedRateLimit({
    key: `auth-login-ip:${ip}`,
    limit: 30,
    windowMs: 60_000,
    failClosed: false,
  });
}

export async function limitActivationResendIp(ip: string) {
  return consumeDistributedRateLimit({
    key: `activation-resend-ip:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
    failClosed: false,
  });
}

export async function limitActivationResendOrder(orderId: string) {
  return consumeDistributedRateLimit({
    key: `activation-resend-order:${orderId}`,
    limit: 1,
    windowMs: 10 * 60 * 1000,
    failClosed: false,
  });
}

export async function rejectCheckoutInitializeFlood(request: NextRequest) {
  const quota = await consumeDistributedRateLimit({
    key: `checkout-api:${requestIp(request.headers)}`,
    limit: 20,
    windowMs: 60_000,
    failClosed: true,
  });
  if (quota.allowed) return null;
  return NextResponse.json(
    publicError("RATE_LIMITED", { message: "Çok fazla ödeme isteği gönderildi. Lütfen kısa süre sonra tekrar deneyin." }),
    { status: quota.unavailable ? 503 : 429 },
  );
}

export async function rejectPaymentRecoverFlood(request: NextRequest) {
  const quota = await consumeDistributedRateLimit({
    key: `payment-recover-api:${requestIp(request.headers)}`,
    limit: 15,
    windowMs: 60_000,
    failClosed: true,
  });
  if (quota.allowed) return null;
  return NextResponse.json(
    publicError("RATE_LIMITED", { message: "Çok fazla doğrulama isteği gönderildi. Lütfen kısa süre sonra tekrar deneyin." }),
    { status: quota.unavailable ? 503 : 429 },
  );
}

