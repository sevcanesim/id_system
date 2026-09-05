import type { Metadata } from "next";

import { notFound, permanentRedirect } from "next/navigation";
import { isCardProfileServiceActive, type CardProfileRow } from "../../lib/card-profile";
import { fetchPublicCardByToken } from "../../lib/repositories/public-profiles";
import { cardSharePath, cardShareUrl } from "../../lib/public-card/urls";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";


async function getPublishedProfile(slug: string): Promise<CardProfileRow | null> {
  const { data, error } = await fetchPublicCardByToken(slug);
  if (error) return null;
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const databaseProfile = await getPublishedProfile(slug);
  if (databaseProfile) {
    const publicId = databaseProfile.public_id;
    if (!publicId) return { robots: { index: false, follow: false, noarchive: true, nosnippet: true } };
    if ((databaseProfile.card_status !== "ACTIVE" || !isCardProfileServiceActive(databaseProfile))) {
      return {
        title: "Yenomi ID",
        description: "Bu profil şu anda kullanıma açık değil.",
        robots: { index: false, follow: false, noarchive: true, nosnippet: true },
        alternates: { canonical: cardSharePath(publicId) },
      };
    }
    const description = `${databaseProfile.name} — ${[databaseProfile.role, databaseProfile.company].filter(Boolean).join(" | ")} dijital kartviziti.`;
    return {
      title: `${databaseProfile.name} | Yenomilabs`,
      description,
      robots: databaseProfile.search_indexing_enabled
        ? { index: true, follow: true }
        : { index: false, follow: false, noarchive: true, nosnippet: true },
      alternates: { canonical: cardSharePath(publicId) },
      openGraph: {
        type: "profile",
        url: cardShareUrl(publicId),
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

  return {};
}

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const databaseProfile = await getPublishedProfile(slug);

  if (databaseProfile) {
    if (!databaseProfile.public_id) notFound();
    permanentRedirect(cardSharePath(databaseProfile.public_id));
  }

  notFound();
}
