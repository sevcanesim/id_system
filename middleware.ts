import { NextRequest, NextResponse } from "next/server";
import { consumeDistributedRateLimit, requestIp } from "./lib/security/rate-limit";

const AUTH_COOKIE = "yenomi-access-token";
const PROTECTED_PAGES = ["/admin", "/kurumsal/panel", "/siparislerim", "/kartim", "/kartlarim", "/olustur", "/yenile", "/ayarlar", "/istatistikler"];
const PRIVATE_OR_PROFILE_PREFIXES = ["/admin", "/dashboard", "/giris", "/hesabim", "/kartim", "/kartlarim", "/siparisler", "/siparislerim", "/olustur", "/aktivasyon", "/checkout", "/odeme", "/kurumsal/panel", "/kurumsal/davet", "/p", "/qr", "/api"];

type LimitRule = { limit: number; windowMs: number; scope: string };

function ruleFor(pathname: string, method: string): LimitRule | null {
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
  return null;
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return false;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${decodeURIComponent(token)}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

function isProtectedPage(pathname: string) {
  return PROTECTED_PAGES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  if (isProtectedPage(pathname) && !(await hasValidSession(request))) {
    const loginUrl = new URL("/giris", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" });
    redirect.headers.set("X-Request-Id", requestId);
    return redirect;
  }

  const rule = ruleFor(pathname, request.method);
  if (rule) {
    const ip = requestIp(request.headers);
    const userHint = request.cookies.get(AUTH_COOKIE)?.value?.slice(-16) || "anonymous";
    const result = await consumeDistributedRateLimit({ key: `${rule.scope}:${ip}:${userHint}`, limit: rule.limit, windowMs: rule.windowMs });
    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      const headers = { "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(result.limit), "X-RateLimit-Remaining": String(result.remaining), "X-Request-Id": requestId };
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.", code: "RATE_LIMITED", reference: requestId }, { status: 429, headers });
      return new NextResponse("Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.", { status: 429, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
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
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*", "/kurumsal/panel/:path*", "/siparislerim/:path*", "/kartim/:path*", "/kartlarim/:path*", "/olustur/:path*", "/yenile/:path*", "/ayarlar/:path*", "/istatistikler/:path*",
    "/giris", "/api/:path*", "/p/:path*", "/qr/:path*", "/aktivasyon/:path*", "/checkout/:path*", "/odeme/:path*", "/api/location/reverse", "/api/commerce/checkout", "/api/commerce/activate", "/api/commerce/claim", "/api/commerce/activation/resend", "/api/commerce/entitlements", "/api/organizations/members", "/api/organizations/invites", "/api/payments/iyzico/checkout",
  ],
};
