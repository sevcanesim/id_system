import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const admin = getSupabaseAdminClient();
  const { data: profiles, error: profileError } = await admin.from("card_profiles").select("id,name,slug").eq("user_id", data.user.id);
  if (profileError) return NextResponse.json({ error: "Kartlar yüklenemedi." }, { status: 500 });
  const ids = (profiles || []).map((p) => p.id);
  if (!ids.length) return NextResponse.json({ totalViews: 0, last30DaysViews: 0, byDay: [], byCard: [] });
  const since90 = new Date(Date.now() - 89 * 86400000).toISOString();
  const { data: events, error } = await admin.from("card_view_events").select("profile_id,viewed_at").in("profile_id", ids).gte("viewed_at", since90).limit(5000);
  if (error) return NextResponse.json({ totalViews: 0, last30DaysViews: 0, byDay: [], byCard: [], available: false });
  const last30 = Date.now() - 30 * 86400000;
  const dayMap: Record<string, number> = {};
  const cardMap: Record<string, number> = {};
  let last30DaysViews = 0;
  for (const event of events || []) {
    const day = String(event.viewed_at).slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
    cardMap[event.profile_id] = (cardMap[event.profile_id] || 0) + 1;
    if (new Date(event.viewed_at).getTime() >= last30) last30DaysViews++;
  }
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  return NextResponse.json({
    totalViews: (events || []).length,
    last30DaysViews,
    byDay: Object.entries(dayMap).sort(([a],[b]) => a.localeCompare(b)).map(([date,count]) => ({ date, count })),
    byCard: Object.entries(cardMap).map(([id,count]) => ({ id, name: profileMap.get(id)?.name || "Kart", count })).sort((a,b)=>b.count-a.count),
    available: true,
  });
}
