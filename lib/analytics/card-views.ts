import { headers } from "next/headers";
import { getSupabaseAdminClient } from "../supabase/server-admin";

// Best-effort, fire-and-forget card view logging. Called from the public
// card page (a server component) so it captures real page loads including
// visitors without JavaScript, without adding latency to the response —
// callers should invoke this with `void logCardView(...)`, never `await`.
//
// Location is coarse (country/city) read from whatever geo headers the
// hosting edge provides (Vercel or Cloudflare); if neither is present both
// fields are simply null. No IP address is stored, and failures are
// swallowed silently — a broken analytics insert must never break a public
// profile page.
export async function logCardView(profileId: string): Promise<void> {
  try {
    const headerList = await headers();
    const country = headerList.get("x-vercel-ip-country") || headerList.get("cf-ipcountry") || null;
    const city = headerList.get("x-vercel-ip-city") || null;
    const referrer = headerList.get("referer")?.slice(0, 500) || null;

    const admin = getSupabaseAdminClient();
    await admin.from("card_view_events").insert({
      profile_id: profileId,
      country: country ? decodeURIComponent(country) : null,
      city: city ? decodeURIComponent(city) : null,
      referrer,
    });
  } catch {
    // Analytics is never allowed to affect the public card page.
  }
}
