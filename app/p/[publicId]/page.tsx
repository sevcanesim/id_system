
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CardTemplate from "../../CardTemplate";
import PublicProfileProtection from "../../components/security/PublicProfileProtection";
import { getPublicSupabaseClient } from "../../../lib/supabase/public";
import { isCardProfileServiceActive, rowToCardData } from "../../../lib/card-profile";
import { fetchProfileByPublicId } from "../../../lib/repositories/profiles";
import { logCardView } from "../../../lib/analytics/card-views";
import { fetchCardBranding, fetchOrganizationLinks } from "../../../lib/organizations/card-branding";

type PageProps = { params: Promise<{ publicId: string }> };
export const dynamic = "force-dynamic";

async function getProfile(publicId: string) {
  const supabase = getPublicSupabaseClient();
  if (!supabase) return null;
  const { data } = await fetchProfileByPublicId(supabase, publicId);
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const profile = await getProfile(publicId);
  if (!profile) return { robots: { index: false, follow: false, noarchive: true } };
  if ((profile.card_status !== "ACTIVE" || !isCardProfileServiceActive(profile))) {
    return {
      title: "Yenomi ID",
      description: "Bu profil şu anda kullanıma açık değil.",
      robots: { index: false, follow: false, noarchive: true, nosnippet: true },
      alternates: { canonical: `/p/${profile.public_id}` },
    };
  }
  const description = `${profile.name} — ${[profile.role, profile.company].filter(Boolean).join(" | ")} dijital kartviziti.`;
  return {
    title: `${profile.name} | Yenomilabs`,
    description,
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
    alternates: { canonical: `/p/${profile.public_id}` },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { publicId } = await params;
  const profile = await getProfile(publicId);
  if (!profile) notFound();
  if (profile.card_status === "LOST") return <main className="profile-state-page p12-profile-state"><section><span>YENOMI ID</span><h1>Bu kart kayıp olarak bildirildi.</h1><p>Kart sahibinin kişisel bilgileri güvenlik nedeniyle gösterilmiyor.</p></section></main>;
  if (!isCardProfileServiceActive(profile)) return <main className="profile-state-page p12-profile-state"><section><span>YENOMI ID</span><h1>Bu profil şu anda aktif değil.</h1><p>Dijital profil şu anda kullanılamıyor. Daha sonra tekrar deneyebilirsiniz.</p></section></main>;
  if (profile.card_status === "SUSPENDED" || profile.card_status === "REFUNDED") return <main className="profile-state-page p12-profile-state"><section><span>YENOMI ID</span><h1>Bu profil şu anda aktif değil.</h1><p>Profil yeniden etkinleştirildiğinde aynı bağlantı tekrar açılacaktır.</p></section></main>;
  // Awaited (not fire-and-forget): serverless environments may terminate the
  // function before an un-awaited promise finishes, which would silently
  // drop view events. logCardView() swallows its own errors, so this can
  // only add a small amount of latency, never break the page.
  await logCardView(profile.id);
  const branding = await fetchCardBranding(profile.user_id);
  const links = await fetchOrganizationLinks(profile.user_id, profile.id);
  return <main id="main-content" className="p12-public-card-page"><PublicProfileProtection profileId={profile.public_id || profile.id.slice(0, 8)} generatedAt={new Date().toISOString()} /><CardTemplate data={{ ...rowToCardData(profile), links }} slug={`p/${profile.public_id}`} branding={branding} /></main>;
}
