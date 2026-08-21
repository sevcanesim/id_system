import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  resolveMiddlewareSession,
} from "./lib/auth/http-only-session";
import { consumeDistributedRateLimit, requestIp } from "./lib/security/rate-limit";

const AUTH_COOKIE = ACCESS_COOKIE;
const PROTECTED_PAGES = ["/admin", "/kurumsal/panel", "/hesabim", "/siparislerim", "/kartim", "/kartlarim", "/olustur", "/yenile", "/ayarlar", "/istatistikler", "/leadler"];
const PRIVATE_OR_PROFILE_PREFIXES = ["/admin", "/dashboard", "/giris", "/hesabim", "/kartim", "/kartlarim", "/siparisler", "/siparislerim", "/olustur", "/aktivasyon", "/checkout", "/odeme", "/sepet", "/leadler", "/kurumsal/panel", "/kurumsal/davet", "/p", "/e", "/qr", "/api"];
const JSON_BODY_MAX_BYTES = 100 * 1024;
const UPLOAD_PATH = "/api/organizations/links/upload";
const FAIL_CLOSED_SCOPES = new Set([
  "checkout",
  "legacy-checkout",
  "auth-session-cookie",
  "iyzico-recover",
  "activation",
  "claim",
]);

type LimitRule = { limit: number; windowMs: number; scope: string };

function ruleFor(pathname: string, method: string): LimitRule | null {
  if (pathname === "/api/auth/session") return { limit: 30, windowMs: 60_000, scope: "auth-session-cookie" };
  if (pathname === "/giris") return { limit: 30, windowMs: 60_000, scope: "login-page" };
  if (pathname === "/api/location/reverse") return { limit: 40, windowMs: 60_000, scope: "location" };
  if (pathname === "/api/commerce/checkout") return { limit: 12, windowMs: 60_000, scope: "checkout" };
  if (pathname === "/api/commerce/activate") return { limit: 10, windowMs: 60_000, scope: "activation" };
  if (pathname === "/api/commerce/claim") return { limit: 10, windowMs: 60_000, scope: "claim" };
  if (pathname === "/api/commerce/activation/resend") return { limit: 5, windowMs: 15 * 60_000, scope: "activation-resend" };
  if (pathname === "/api/commerce/entitlements") return { limit: 30, windowMs: 60_000, scope: "entitlements" };
  if (pathname === "/api/organizations/members" && method !== "GET") return { limit: 20, windowMs: 60_000, scope: "organization-members" };
  if (pathname === "/api/organizations/invites" && method !== "GET") return { limit: 10, windowMs: 60_000, scope: "organization-invites" };
  if (pathname === "/api/payments/iyzico/checkout") return { limit: 3, windowMs: 60_000, scope: "legacy-checkout" };
  if (pathname === "/api/payments/iyzico/recover") return { limit: 8, windowMs: 60_000, scope: "iyzico-recover" };
  if (pathname === "/api/payments/iyzico/webhook") return { limit: 30, windowMs: 60_000, scope: "iyzico-webhook" };
  if (pathname === "/api/commerce/orders/pending") return { limit: 20, windowMs: 60_000, scope: "pending-order" };
  if (pathname === "/api/networking/inbox" && method !== "GET") return { limit: 12, windowMs: 60_000, scope: "network-mail-inbox" };
  return null;
}

function isProtectedPage(pathname: string) {
  return PROTECTED_PAGES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function payloadTooLarge(pathname: string, method: string, headers: Headers): boolean {
  if (!["POST", "PUT", "PATCH"].includes(method)) return false;
  if (!pathname.startsWith("/api/") || pathname === UPLOAD_PATH) return false;
  const raw = headers.get("content-length");
  if (!raw) return false;
  const length = Number(raw);
  return Number.isFinite(length) && length > JSON_BODY_MAX_BYTES;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  if (pathname === "/nfc-siparis" || pathname.startsWith("/nfc-siparis/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/checkout";
    const redirect = NextResponse.redirect(url, 308);
    redirect.headers.set("X-Request-Id", requestId);
    return redirect;
  }

  if (payloadTooLarge(pathname, request.method, request.headers)) {
    return NextResponse.json(
      { error: "İstek gövdesi çok büyük.", code: "PAYLOAD_TOO_LARGE", reference: requestId },
      { status: 413, headers: { "X-Request-Id": requestId } },
    );
  }

  const session = isProtectedPage(pathname) ? await resolveMiddlewareSession(request) : null;

  if (session && !session.allow) {
    const loginUrl = new URL("/giris", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(loginUrl);
    clearSessionCookies(redirect);
    redirect.headers.set("X-Request-Id", requestId);
    return redirect;
  }

  const rule = ruleFor(pathname, request.method);
  if (rule) {
    const ip = requestIp(request.headers);
    const userHint = request.cookies.get(AUTH_COOKIE)?.value?.slice(-16) || "anonymous";
    const result = await consumeDistributedRateLimit({
      key: `${rule.scope}:${ip}:${userHint}`,
      limit: rule.limit,
      windowMs: rule.windowMs,
      failClosed: pathname.startsWith("/api/") && FAIL_CLOSED_SCOPES.has(rule.scope),
    });
    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      const status = result.unavailable ? 503 : 429;
      const code = result.unavailable ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMITED";
      const error = result.unavailable
        ? "Güvenlik limiti şu anda doğrulanamıyor. Lütfen kısa süre sonra tekrar deneyin."
        : "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.";
      const headers = { "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(result.limit), "X-RateLimit-Remaining": String(result.remaining), "X-Request-Id": requestId };
      if (pathname.startsWith("/api/")) return NextResponse.json({ error, code, reference: requestId }, { status, headers });
      return new NextResponse(error, { status, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Request-Id", requestId);
  if (PRIVATE_OR_PROFILE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    response.headers.set("Cache-Control", pathname.startsWith("/api/") ? "private, no-store" : "private, no-store, max-age=0");
  }
  if (pathname === "/aktivasyon" || pathname.startsWith("/aktivasyon/") || pathname === "/checkout" || pathname.startsWith("/checkout/") || pathname.startsWith("/odeme/")) {
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  }
  if (session?.allow && session.rotated) applySessionCookies(response, session.rotated);
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*", "/kurumsal/panel/:path*", "/siparislerim/:path*", "/kartim/:path*", "/kartlarim/:path*", "/olustur/:path*", "/yenile/:path*", "/ayarlar/:path*", "/istatistikler/:path*", "/leadler", "/leadler/:path*",
    "/giris", "/hesabim", "/hesabim/:path*", "/sepet", "/aktivasyon", "/aktivasyon/:path*", "/checkout", "/checkout/:path*", "/nfc-siparis", "/nfc-siparis/:path*", "/odeme/:path*", "/api/:path*", "/p/:path*", "/e/:path*", "/qr/:path*", "/api/location/reverse", "/api/commerce/checkout", "/api/commerce/activate", "/api/commerce/claim", "/api/commerce/activation/resend", "/api/commerce/entitlements", "/api/organizations/members", "/api/organizations/invites", "/api/payments/iyzico/checkout", "/api/payments/iyzico/recover", "/api/payments/iyzico/webhook", "/api/commerce/orders/pending", "/api/networking/inbox", "/api/auth/session",
  ],
};
