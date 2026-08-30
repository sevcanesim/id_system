import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "../supabase/server-admin";

const UNIQUE_VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const AUTOMATED_AGENT = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|linkedinbot|twitterbot|google-inspectiontool|lighthouse|headlesschrome/i;

function clientIp(headerList: Awaited<ReturnType<typeof headers>>) {
  const forwarded =
    headerList.get("cf-connecting-ip") ||
    headerList.get("x-vercel-forwarded-for") ||
    headerList.get("x-forwarded-for") ||
    headerList.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || null;
}

function visitorFingerprint(profileId: string, ipAddress: string | null, userAgent: string) {
  if (!ipAddress) return null;
  const secret = process.env.ANALYTICS_FINGERPRINT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`${profileId}\n${ipAddress}\n${userAgent}`)
    .digest("hex");
}

function decodeGeoValue(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function shouldIgnoreView(host: string, userAgent: string) {
  if (process.env.NODE_ENV !== "production") return true;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) return true;
  return AUTOMATED_AGENT.test(userAgent);
}

export async function logCardView(profileId: string): Promise<void> {
  try {
    const headerList = await headers();
    const host = headerList.get("host") || "";
    const userAgent = (headerList.get("user-agent") || "unknown").slice(0, 512);
    if (shouldIgnoreView(host, userAgent)) return;

    const fingerprint = visitorFingerprint(profileId, clientIp(headerList), userAgent);
    const admin = getSupabaseAdminClient();

    if (fingerprint) {
      const since = new Date(Date.now() - UNIQUE_VIEW_WINDOW_MS).toISOString();
      const { data: recentView, error: lookupError } = await admin
        .from("card_view_events")
        .select("id")
        .eq("profile_id", profileId)
        .eq("visitor_fingerprint", fingerprint)
        .gte("viewed_at", since)
        .limit(1)
        .maybeSingle();

      if (!lookupError && recentView) return;
    }

    const country = headerList.get("x-vercel-ip-country") || headerList.get("cf-ipcountry");
    const city = headerList.get("x-vercel-ip-city");
    const referrer = headerList.get("referer")?.slice(0, 500) || null;

    await admin.from("card_view_events").insert({
      profile_id: profileId,
      country: decodeGeoValue(country),
      city: decodeGeoValue(city),
      referrer,
      visitor_fingerprint: fingerprint,
    });
  } catch {}
}
