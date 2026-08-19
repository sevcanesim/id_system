import type { Metadata } from "next";

import { notFound, permanentRedirect } from "next/navigation";
import CardTemplate from "../CardTemplate";
import { profiles } from "../data";
import { getPublicSupabaseClient } from "../../lib/supabase/public";
import { isCardProfileServiceActive, type CardProfileRow } from "../../lib/card-profile";
import { demoProfileToCardData } from "../../lib/demo-card-profile";
import { fetchProfileBySlug } from "../../lib/repositories/profiles";
import { cardSharePath } from "../../lib/public-card/urls";

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
        alternates: { canonical: cardSharePath(databaseProfile.slug) },
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
        url: `https://qr.yenomilabs.com${cardSharePath(databaseProfile.slug)}`,
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
    permanentRedirect(cardSharePath(databaseProfile.slug));
  }

  const profile = profiles[slug];
  if (!profile) {
    const redirectTarget = await getRedirectTarget(slug);
    if (redirectTarget) permanentRedirect(cardSharePath(redirectTarget));
    notFound();
  }

  return (
    <main id="main-content" className="p12-public-card-page">
      <CardTemplate data={demoProfileToCardData(profile)} slug={profile.slug} imagePosition={profile.imagePosition} />
    </main>
  );
}
