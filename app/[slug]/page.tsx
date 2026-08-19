import type { Metadata } from "next";

import { notFound, permanentRedirect } from "next/navigation";
import CardTemplate from "../CardTemplate";
import { profiles } from "../data";
import { getPublicSupabaseClient } from "../../lib/supabase/public";
import { isCardProfileServiceActive, rowToCardData, type CardProfileRow } from "../../lib/card-profile";
import { demoProfileToCardData } from "../../lib/demo-card-profile";
import { fetchProfileBySlug } from "../../lib/repositories/profiles";
import { fetchCardBranding, fetchOrganizationLinks } from "../../lib/organizations/card-branding";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";


async function getRedirectTarget(slug: string): Promise<string | null> {
  const supabase = getPublicSupabaseClient();
  if (!supabase) return null;
  const { data: redirectRow } = await supabase
    .from("card_profile_slug_redirects")
    .select("profile_id")
    .eq("old_slug", slug)
    .maybeSingle();
  if (!redirectRow?.profile_id) return null;
  const { data: profile } = await supabase
    .from("card_profiles")
    .select("slug,is_published")
    .eq("id", redirectRow.profile_id)
    .maybeSingle();
  return profile?.is_published && profile.slug ? profile.slug : null;
}

async function getPublishedProfile(slug: string): Promise<CardProfileRow | null> {
  const supabase = getPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await fetchProfileBySlug(supabase, slug);
  if (error) return null;
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const databaseProfile = await getPublishedProfile(slug);
  if (databaseProfile) {
    if ((databaseProfile.card_status !== "ACTIVE" || !isCardProfileServiceActive(databaseProfile))) {
      return {
        title: "Yenomi ID",
        description: "Bu profil şu anda kullanıma açık değil.",
        robots: { index: false, follow: false, noarchive: true, nosnippet: true },
        alternates: { canonical: `/${databaseProfile.slug}` },
      };
    }
    const description = `${databaseProfile.name} — ${[databaseProfile.role, databaseProfile.company].filter(Boolean).join(" | ")} dijital kartviziti.`;
    return {
      title: `${databaseProfile.name} | Yenomilabs`,
      description,
      robots: { index: false, follow: false, noarchive: true, nosnippet: true },
      alternates: { canonical: `/${databaseProfile.slug}` },
      openGraph: {
        type: "profile",
        url: `https://qr.yenomilabs.com/${databaseProfile.slug}`,
        title: `${databaseProfile.name} | Yenomilabs`,
        description,
        images: databaseProfile.image_url ? [databaseProfile.image_url] : [],
        siteName: "Yenomilabs"
      },
      twitter: {
        card: databaseProfile.image_url ? "summary_large_image" : "summary",
        title: `${databaseProfile.name} | Yenomilabs`,
        description,
        images: databaseProfile.image_url ? [databaseProfile.image_url] : []
      }
    };
  }

  const profile = profiles[slug];
  if (!profile) return {};
  return {
    title: `${profile.name} | Yenomilabs`,
    description: profile.description,
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
    alternates: { canonical: `/${profile.slug}` },
    openGraph: {
      type: "profile",
      url: `https://qr.yenomilabs.com/${profile.slug}`,
      title: `${profile.name} | Yenomilabs`,
      description: profile.description,
      images: [profile.image],
      siteName: "Yenomilabs"
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name} | Yenomilabs`,
      description: profile.description,
      images: [profile.image]
    }
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const databaseProfile = await getPublishedProfile(slug);

  if (databaseProfile) {
    if (databaseProfile.public_id) permanentRedirect(`/p/${databaseProfile.public_id}`);
    if (databaseProfile.card_status === "LOST") {
      return <main className="profile-state-page p12-profile-state"><section><span>YENOMI ID</span><h1>Bu kart kayıp olarak bildirildi.</h1><p>Kart sahibinin kişisel bilgileri güvenlik nedeniyle gösterilmiyor. Kartı bulduysanız sahibine doğrudan kart üzerindeki bilgiler dışında ulaşmaya çalışmayın.</p></section></main>;
    }
    if (!isCardProfileServiceActive(databaseProfile)) {
      return <main className="profile-state-page p12-profile-state"><section><span>YENOMI ID</span><h1>Bu profil şu anda aktif değil.</h1><p>Dijital profil şu anda kullanılamıyor. Daha sonra tekrar deneyebilirsiniz.</p></section></main>;
    }
    if (databaseProfile.card_status === "SUSPENDED" || databaseProfile.card_status === "REFUNDED") {
      return <main className="profile-state-page p12-profile-state"><section><span>YENOMI ID</span><h1>Bu profil şu anda aktif değil.</h1><p>Profil yeniden etkinleştirildiğinde aynı bağlantı tekrar kullanılabilir olacaktır.</p></section></main>;
    }
    return (
      <main className="p12-public-card-page">
        <CardTemplate data={{ ...rowToCardData(databaseProfile), links: await fetchOrganizationLinks(databaseProfile.user_id, databaseProfile.id) }} slug={databaseProfile.slug} branding={await fetchCardBranding(databaseProfile.user_id)} />
      </main>
    );
  }

  const profile = profiles[slug];
  if (!profile) {
    const redirectTarget = await getRedirectTarget(slug);
    if (redirectTarget) permanentRedirect(`/${redirectTarget}`);
    notFound();
  }

  return (
    <main id="main-content" className="p12-public-card-page">
      <CardTemplate data={demoProfileToCardData(profile)} slug={profile.slug} imagePosition={profile.imagePosition} />
    </main>
  );
}
