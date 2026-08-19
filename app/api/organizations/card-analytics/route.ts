import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { isOrganizationRole } from "../../../../lib/organizations/permissions";

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function manager(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  return data && data.status === "ACTIVE" && isOrganizationRole(data.role) && ["OWNER", "ADMIN", "HR"].includes(data.role) ? data : null;
}

const ALLOWED_WINDOWS = new Set([7, 30, 90]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET: aggregated card view statistics for every employee card in the
// organization. Aggregation happens in this route rather than in SQL — org
// sizes here are small (tens of employees, hundreds of views), so fetching
// up to a few thousand raw rows and reducing them in JS is simple and fast
// enough; a SQL-side rollup (materialized view or RPC) is the natural next
// step if an organization's view volume grows much larger than that.
export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const requestedDays = Number(request.nextUrl.searchParams.get("days") || 30);
  const requestedFrom = request.nextUrl.searchParams.get("from");
  const requestedTo = request.nextUrl.searchParams.get("to");
  let windowDays = ALLOWED_WINDOWS.has(requestedDays) ? requestedDays : 30;
  let periodStart: string;
  let periodEnd: string;
  let untilExclusive: string | null = null;
  if (requestedFrom || requestedTo) {
    if (!requestedFrom || !requestedTo || !ISO_DATE.test(requestedFrom) || !ISO_DATE.test(requestedTo)) {
      return NextResponse.json({ error: "Başlangıç ve bitiş tarihi YYYY-MM-DD biçiminde gerekli." }, { status: 400 });
    }
    const fromDate = new Date(`${requestedFrom}T00:00:00.000Z`);
    const toDate = new Date(`${requestedTo}T00:00:00.000Z`);
    windowDays = Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
    if (!Number.isFinite(windowDays) || windowDays < 1 || windowDays > 366) {
      return NextResponse.json({ error: "Tarih aralığı 1–366 gün arasında olmalı." }, { status: 400 });
    }
    periodStart = requestedFrom;
    periodEnd = requestedTo;
    untilExclusive = new Date(toDate.getTime() + 86400000).toISOString();
  } else {
    periodEnd = new Date().toISOString().slice(0, 10);
    periodStart = new Date(Date.now() - (windowDays - 1) * 86400000).toISOString().slice(0, 10);
  }
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });
  const actor = await manager(ctx.admin, ctx.user.id, organizationId);
  if (!actor) return NextResponse.json({ error: "Kart istatistiklerini görme yetkin yok." }, { status: 403 });

  const { data: members, error: membersError } = await ctx.admin
    .from("organization_members")
    .select("user_id,full_name,email,department")
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .not("user_id", "is", null);
  if (membersError) return NextResponse.json({ error: "Çalışanlar yüklenemedi." }, { status: 500 });

  const userIds = (members || []).map((member) => member.user_id).filter((id): id is string => Boolean(id));
  if (userIds.length === 0) return NextResponse.json({ totalViews: 0, last30DaysViews: 0, windowDays, periodDays: windowDays, byCountry: [], byCard: [], byDay: [], content: { totalInteractions: 0, clicks: 0, downloads: 0, byLink: [] } });

  const [{ data: organization }, { data: assignedCards, error: cardsError }] = await Promise.all([
    ctx.admin.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    ctx.admin.from("physical_cards").select("owner_profile_id").eq("organization_id", organizationId).not("owner_profile_id", "is", null),
  ]);
  if (cardsError) return NextResponse.json({ error: "Kurumsal kart eşleşmeleri yüklenemedi." }, { status: 500 });

  const assignedProfileIds = Array.from(new Set((assignedCards || []).map((row) => row.owner_profile_id).filter(Boolean))) as string[];
  const profileMap = new Map<string, { id: string; name: string; slug: string | null; user_id: string }>();

  if (assignedProfileIds.length) {
    const { data: assignedProfiles, error } = await ctx.admin.from("card_profiles").select("id,name,slug,user_id").in("id", assignedProfileIds);
    if (error) return NextResponse.json({ error: "Kartlar yüklenemedi." }, { status: 500 });
    for (const profile of assignedProfiles || []) profileMap.set(profile.id, profile);
  }

  // Dijital profil fiziksel karta henüz bağlanmamışsa yalnızca aynı şirket adıyla
  // oluşturulmuş profili dahil et. Böylece çalışanın kişisel/başka şirket kartı
  // kurumsal istatistiğe karışmaz.
  if (organization?.name) {
    const { data: corporateProfiles, error } = await ctx.admin.from("card_profiles").select("id,name,slug,user_id").in("user_id", userIds).ilike("company", organization.name);
    if (error) return NextResponse.json({ error: "Kurumsal kartlar yüklenemedi." }, { status: 500 });
    for (const profile of corporateProfiles || []) profileMap.set(profile.id, profile);
  }

  const profiles = Array.from(profileMap.values());
  const profileIds = profiles.map((profile) => profile.id);
  if (profileIds.length === 0) return NextResponse.json({ totalViews: 0, last30DaysViews: 0, windowDays, periodDays: windowDays, byCountry: [], byCard: [], byDay: [], content: { totalInteractions: 0, clicks: 0, downloads: 0, byLink: [] } });

  const since = `${periodStart}T00:00:00.000Z`;
  const eventsQuery = ctx.admin
    .from("card_view_events")
    .select("profile_id,viewed_at,country")
    .in("profile_id", profileIds)
    .gte("viewed_at", since)
    .limit(5000);
  const { data: events, error: eventsError } = untilExclusive
    ? await eventsQuery.lt("viewed_at", untilExclusive)
    : await eventsQuery;
  if (eventsError) {
    const relationMissing = eventsError.code === "42P01" || eventsError.code === "PGRST205" || (/card_view_events/i.test(eventsError.message || "") && /does not exist|schema cache/i.test(eventsError.message || ""));
    console.error("[card-analytics] card_view_events query failed", { organizationId, code: eventsError.code, message: eventsError.message });

    // Bu endpoint supabase/migrations/030_card_view_analytics.sql ile oluşturulan card_view_events tablosunu kullanır.
    // Analitik, kurumsal panelin geri kalanını çalışamaz hale getirmemeli.
    // Supabase/PostgREST schema cache geçici olarak tabloyu görmüyorsa panel
    // kontrollü biçimde 'veri kullanılamıyor' durumuna düşer. verify:db bu
    // şema problemini yine release gate'te ayrıca yakalar.
    if (relationMissing) {
      return NextResponse.json({
        totalViews: 0,
        last30DaysViews: 0,
        windowDays,
        byCountry: [],
        byCard: [],
        available: false,
        warning: "Analitik veritabanı şeması PostgREST tarafından henüz görünmüyor.",
        code: "ANALYTICS_SCHEMA_UNAVAILABLE",
      });
    }

    return NextResponse.json({ error: "Görüntülenme verisi yüklenemedi.", code: "ANALYTICS_QUERY_FAILED" }, { status: 500 });
  }

  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const countryCounts: Record<string, number> = {};
  const cardCounts: Record<string, number> = {};
  const departmentCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  let last30DaysViews = 0;

  for (const event of events || []) {
    const country = event.country || "Bilinmiyor";
    countryCounts[country] = (countryCounts[country] || 0) + 1;
    cardCounts[event.profile_id] = (cardCounts[event.profile_id] || 0) + 1;
    const day = String(event.viewed_at).slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    if (new Date(event.viewed_at).getTime() >= thirtyDaysAgo) last30DaysViews += 1;
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const departmentByUserId = new Map(
    (members || []).map((member) => [
      member.user_id,
      member.department || "Belirtilmedi",
    ]),
  );
  for (const [profileId, count] of Object.entries(cardCounts)) {
    const userId = profileById.get(profileId)?.user_id;
    const department =
      (userId && departmentByUserId.get(userId)) || "Belirtilmedi";
    departmentCounts[department] = (departmentCounts[department] || 0) + count;
  }
  const byCard = Object.entries(cardCounts)
    .map(([profileId, count]) => ({ profileId, name: profileById.get(profileId)?.name || "—", slug: profileById.get(profileId)?.slug || null, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const byCountry = Object.entries(countryCounts).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
  const byDepartment = Object.entries(departmentCounts)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  const contentEventsQuery = ctx.admin.from("organization_link_events").select("organization_link_id,event_type,occurred_at").eq("organization_id", organizationId).gte("occurred_at", since).limit(5000);
  const contentEventsPromise = untilExclusive
    ? contentEventsQuery.lt("occurred_at", untilExclusive)
    : contentEventsQuery;
  const [{ data: organizationLinks }, { data: contentEvents, error: contentError }] = await Promise.all([
    ctx.admin.from("organization_links").select("id,kind,label").eq("organization_id", organizationId),
    contentEventsPromise,
  ]);
  const linkById = new Map((organizationLinks || []).map((link) => [link.id, link]));
  const contentCounts = new Map<string, { count: number; downloads: number }>();
  let clicks = 0;
  let downloads = 0;
  if (!contentError) {
    for (const event of contentEvents || []) {
      const current = contentCounts.get(event.organization_link_id) || { count: 0, downloads: 0 };
      current.count += 1;
      if (event.event_type === "DOWNLOAD") {
        current.downloads += 1;
        downloads += 1;
      } else clicks += 1;
      contentCounts.set(event.organization_link_id, current);
    }
  }
  const contentByLink = Array.from(contentCounts.entries())
    .map(([linkId, counts]) => ({
      linkId,
      label: linkById.get(linkId)?.label || "Kurumsal içerik",
      kind: linkById.get(linkId)?.kind || "UNKNOWN",
      ...counts,
    }))
    .sort((a, b) => b.count - a.count);
  const contentKindCounts = new Map<string, { count: number; downloads: number }>();
  for (const item of contentByLink) {
    const current = contentKindCounts.get(item.kind) || { count: 0, downloads: 0 };
    current.count += item.count;
    current.downloads += item.downloads;
    contentKindCounts.set(item.kind, current);
  }
  const contentByKind = Array.from(contentKindCounts.entries())
    .map(([kind, counts]) => ({ kind, ...counts }))
    .sort((a, b) => b.count - a.count);
  const periodStartDate = new Date(`${periodStart}T00:00:00.000Z`);
  const byDay = Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(periodStartDate.getTime() + index * 86400000)
      .toISOString()
      .slice(0, 10);
    return { date, count: dailyCounts[date] || 0 };
  });

  return NextResponse.json({
    available: true,
    warning: null,
    code: null,
    totalViews: (events || []).length,
    last30DaysViews,
    windowDays,
    periodDays: windowDays,
    periodStart,
    periodEnd,
    byDay,
    byCountry,
    byCard,
    byDepartment,
    content: {
      totalInteractions: clicks + downloads,
      clicks,
      downloads,
      byLink: contentByLink,
      byKind: contentByKind,
    },
  });
}
