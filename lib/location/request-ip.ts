/** Request IP helpers for silent geolocation fallback. Not a security boundary. */

const PRIVATE_V4 = /^(127\.|10\.|192\.168\.|169\.254\.|0\.|255\.)/;
const PRIVATE_V4_172 = /^172\.(1[6-9]|2\d|3[0-1])\./;

export function normalizeClientIp(value: string | null | undefined): string {
  if (!value) return "";
  const first = value.split(",")[0]?.trim() || "";
  const ip = first.replace(/^::ffff:/i, "");
  if (ip === "::1") return "";
  return ip;
}

export function isPublicIp(ip: string): boolean {
  if (!ip) return false;
  if (PRIVATE_V4.test(ip) || PRIVATE_V4_172.test(ip)) return false;
  if (ip.includes(":") && (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80"))) return false;
  return true;
}

export function clientIpFromHeaders(headers: Headers): string {
  return normalizeClientIp(
    headers.get("cf-connecting-ip")
      || headers.get("x-real-ip")
      || headers.get("x-forwarded-for"),
  );
}

export function locationFromPlatformHeaders(headers: Headers): { city: string; district: string; addressLine: string } | null {
  const rawCity = headers.get("x-vercel-ip-city") || headers.get("cf-ipcity") || "";
  const city = rawCity ? decodeURIComponent(rawCity) : "";
  const region = headers.get("x-vercel-ip-country-region") || headers.get("cf-region") || "";
  const country = headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || "";
  if (!city && !country) return null;
  return {
    city,
    district: region && region !== city ? region : "",
    addressLine: [city, country].filter(Boolean).join(", "),
  };
}
