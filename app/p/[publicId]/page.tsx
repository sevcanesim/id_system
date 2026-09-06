import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PublicProfileProtection from "../../components/security/PublicProfileProtection";
import PublicCardWithNetworking from "../../components/public/PublicCardWithNetworking";
import { isCardProfileServiceActive, rowToCardData } from "../../../lib/card-profile";
import { fetchPublicCardByToken } from "../../../lib/repositories/public-profiles";
import { logCardView } from "../../../lib/analytics/card-views";
import { fetchCardBranding, fetchOrganizationLinks } from "../../../lib/organizations/card-branding";
import { fetchCardLocaleOverlays } from "../../../lib/public-card/locales";
import { cardSharePath } from "../../../lib/public-card/urls";
import { getPublicCompanyVerification } from "../../../lib/organizations/verified-company";
import { getSupabaseAdminClient } from "../../../lib/supabase/server-admin";
import { Icon } from "../../icons";
import styles from "./PublicCardUnavailable.module.css";

type PageProps = {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ utm_campaign?: string | string[] }>;
};
export const dynamic = "force-dynamic";

async function getProfile(token: string) {
  return fetchPublicCardByToken(token);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const { data: profile } = await getProfile(publicId);
  if (!profile) return { robots: { index: false, follow: false, noarchive: true } };
  if (!profile.public_id) return { robots: { index: false, follow: false, noarchive: true, nosnippet: true } };
  const canonical = cardSharePath(profile.public_id);
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
    robots: profile.search_indexing_enabled
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true, nosnippet: true },
    alternates: { canonical },
  };
}

export default async function PublicProfilePage({ params, searchParams }: PageProps) {
  const { publicId: token } = await params;
  const { data: profile, redirectedFrom } = await getProfile(token);
  if (!profile) notFound();
  if (!profile.public_id) notFound();
  // `/p/{public_id}` is the only canonical public card route. This keeps
  // older `/p/{slug}` cards working without making a name-derived URL the
  // active sharing surface.
  if (redirectedFrom || token !== profile.public_id) {
    permanentRedirect(cardSharePath(profile.public_id));
  }
  if (profile.card_status === "LOST") {
    return (
      <PublicCardUnavailable
        title="Bu kart kayıp olarak bildirildi."
        detail="Kart sahibinin kişisel bilgileri güvenlik nedeniyle gösterilmiyor."
        stateLabel="KAYIP KART GÜVENLİK MODU"
        note="Kart sahibi kartını yeniden etkinleştirene kadar bu bağlantıdaki bilgiler gizli tutulur."
        actionHref="/giris?next=%2Fayarlar"
        actionLabel="Kartımı güvenle yönet"
      />
    );
  }
  if (!isCardProfileServiceActive(profile)) {
    return (
      <PublicCardUnavailable
        title="Bu dijital kart şu an kullanıma açık değil."
        detail="Kart sahibi erişimini yeniden başlattığında, aynı bağlantı otomatik olarak yeniden çalışır."
        actionHref="/giris?next=%2Fayarlar"
        actionLabel="Hesabımdan yenile"
      />
    );
  }
  if (profile.card_status === "SUSPENDED" || profile.card_status === "REFUNDED") {
    return (
      <PublicCardUnavailable
        title="Bu dijital kart şu an kullanıma açık değil."
        detail="Kart sahibi erişimini yeniden başlattığında, aynı bağlantı otomatik olarak yeniden çalışır."
        actionHref="/giris?next=%2Fayarlar"
        actionLabel="Hesabımdan yenile"
      />
    );
  }
  const query = await searchParams;
  const campaign = Array.isArray(query.utm_campaign) ? query.utm_campaign[0] : query.utm_campaign;
  await logCardView(profile.id, { source: "QR", campaign });
  const branding = await fetchCardBranding(profile.user_id);
  const links = await fetchOrganizationLinks(profile.user_id, profile.id, profile.organization_id);
  const companyVerification = await getPublicCompanyVerification(profile.organization_id);
  const locales = await fetchCardLocaleOverlays(getSupabaseAdminClient(), profile.id);
  return (
    <main id="main-content" className="p12-public-card-page">
      <PublicProfileProtection profileId={profile.public_id} generatedAt={new Date().toISOString()} />
      <PublicCardWithNetworking
        data={{ ...rowToCardData(profile), links }}
        slug={profile.slug ?? undefined}
        publicId={profile.public_id}
        branding={branding}
        profilePublicId={profile.public_id}
        profileName={profile.name}
        organizationName={profile.company || branding?.companyName}
        companyVerification={companyVerification}
        source="QR"
        locales={locales}
      />
    </main>
  );
}

function PublicCardUnavailable({
  title,
  detail,
  stateLabel = "PROFİL GEÇİCİ OLARAK KAPALI",
  note = "Aynı QR ve NFC bağlantısı, profil yeniden açıldığında çalışmaya devam eder.",
  actionHref = "/",
  actionLabel = "Yenomi ID’yi keşfet",
}: {
  title: string;
  detail: string;
  stateLabel?: string;
  note?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.card} aria-labelledby="public-card-unavailable-title">
        <div className={styles.brand} aria-label="Yenomi ID">
          <span className={styles.brandMark} aria-hidden="true">Y</span>
          <span>YENOMI ID</span>
        </div>
        <div className={styles.iconFrame} aria-hidden="true">
          <Icon name="lock" />
        </div>
        <span className={styles.eyebrow}>{stateLabel}</span>
        <h1 id="public-card-unavailable-title">{title}</h1>
        <p>{detail}</p>
        <a className={styles.action} href={actionHref}>
          {actionLabel} <span aria-hidden="true"><Icon name="chevronRight" /></span>
        </a>
        <small className={styles.note}>{note}</small>
      </section>
    </main>
  );
}
