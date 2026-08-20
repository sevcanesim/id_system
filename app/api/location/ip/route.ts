import { NextRequest, NextResponse } from "next/server";
import { clientIpFromHeaders, isPublicIp, locationFromPlatformHeaders } from "../../../../lib/location/request-ip";

export const runtime = "nodejs";

type IpWhoResult = {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
};

async function lookupIpWho(ip: string): Promise<{ city: string; district: string; addressLine: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as IpWhoResult;
    if (!payload.success) return null;
    const city = payload.city?.trim() || "";
    const district = payload.region?.trim() && payload.region !== city ? payload.region.trim() : "";
    const country = payload.country?.trim() || "";
    const addressLine = [city, country].filter(Boolean).join(", ");
    if (!city && !addressLine) return null;
    return { city, district, addressLine };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const fromPlatform = locationFromPlatformHeaders(request.headers);
  if (fromPlatform) {
    return NextResponse.json(fromPlatform);
  }

  const ip = clientIpFromHeaders(request.headers);
  if (!isPublicIp(ip)) {
    return NextResponse.json({ city: "", district: "", addressLine: "" });
  }

  const fromLookup = await lookupIpWho(ip);
  if (fromLookup) {
    return NextResponse.json(fromLookup);
  }

  return NextResponse.json({ city: "", district: "", addressLine: "" });
}
