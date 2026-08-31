import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PublicProfileProtection from "../../components/security/PublicProfileProtection";
import PublicCardWithNetworking from "../../components/public/PublicCardWithNetworking";
import { getPublicSupabaseClient } from "../../../lib/supabase/public";
import { isCardProfileServiceActive, rowToCardData } from "../../../lib/card-profile";
import { fetchPublicCardByToken } from "../../../lib/repositories/profiles";
import { logCardView } from "../../../lib/analytics/card-views";
import { fetchCardBranding, fetchOrganizationLinks } from "../../../lib/organizations/card-branding";
import { fetchCardLocaleOverlays } from "../../../lib/public-card/locales";
import { cardSharePath, looksLikePublicId } from "../../../lib/public-card/urls";

type PageProps = { params: Promise<{ publicId: string }> };
export const dynamic = "force-dynamic";

async function getProfile(token: string) {
  const supabase = getPublicSupabaseClient();
  if (!supabase) return { data: null, redirectedFrom: undefined as string | undefined };
  return fetchPublicCardByToken(supabase, token);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const { data: profile } = await getProfile(publicId);
  if (!profile) return { robots: { index: false, follow: false, noarchive: true } };
  const canonical = profile.slug ? cardSharePath(profile.slug) : `/p/${profile.public_id}`;
  if ((profile.card_status !== "ACTIVE" || !isCardProfileServiceActive(profile))) {
    return {
      title: "Yenomi ID",
      description: "Bu profil şu anda kullanıma açık değil.",
      robots: { index: false, follow: false, noarchive: true, nosnippet: true },
      alternates: { canonical },
    };
  }
  const description = `${profile.name} — ${[profile.role, profile.company].filter(Boolean).join(" | ")} dijital kartviziti.`;
  return {
    title: `${profile.name} | Yenomilabs`,
    description,
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
    alternates: { canonical },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { publicId: token } = await params;
  const { data: profile, redirectedFrom } = await getProfile(token);
  if (!profile) notFound();
  if (redirectedFrom && profile.slug) permanentRedirect(cardSharePath(profile.slug));
  if (!looksLikePublicId(token) && profile.slug && token !== profile.slug) {
    permanentRedirect(cardSharePath(profile.slug));
  }
  if (profile.card_status === "LOST") {
    return (
      <PublicCardUnavailable
        title="Bu kart kayıp olarak bildirildi."
        detail="Kart sahibinin kişisel bilgileri güvenlik nedeniyle gösterilmiyor."
      />
    );
  }
  if (!isCardProfileServiceActive(profile)) {
    return (
      <PublicCardUnavailable
        title="Bu profil şu anda aktif değil."
        detail="Dijital profil şu anda kullanılamıyor. Daha sonra tekrar deneyebilirsiniz."
      />
    );
  }
  if (profile.card_status === "SUSPENDED" || profile.card_status === "REFUNDED") {
    return (
      <PublicCardUnavailable
        title="Bu profil şu anda aktif değil."
        detail="Profil yeniden etkinleştirildiğinde aynı bağlantı tekrar açılacaktır."
      />
    );
  }
  await logCardView(profile.id);
  const branding = await fetchCardBranding(profile.user_id);
  const links = await fetchOrganizationLinks(profile.user_id, profile.id, profile.organization_id);
  const supabase = getPublicSupabaseClient();
  const locales = supabase ? await fetchCardLocaleOverlays(supabase, profile.id) : [];
  return (
    <main id="main-content" className="p12-public-card-page">
      <PublicProfileProtection profileId={profile.public_id || profile.id.slice(0, 8)} generatedAt={new Date().toISOString()} />
      <PublicCardWithNetworking
        data={{ ...rowToCardData(profile), links }}
        slug={profile.slug}
        publicId={profile.public_id}
        branding={branding}
        profileId={profile.id}
        profileName={profile.name}
        organizationName={profile.company || branding?.companyName}
        source="QR"
        locales={locales}
      />
    </main>
  );
}

function PublicCardUnavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <main id="main-content" className="profile-state-page p12-profile-state">
      <section>
        <span>YENOMI ID</span>
        <h1>{title}</h1>
        <p>{detail}</p>
        <a className="home-mockup__link-secondary" href="/">Ana sayfaya dön</a>
      </section>
    </main>
  );
}
