
import { notFound } from "next/navigation";
import CardTemplate from "../../CardTemplate";
import PublicProfileProtection from "../../components/security/PublicProfileProtection";
import { getSupabaseAdminClient } from "../../../lib/supabase/server-admin";
import { isCardProfileServiceActive, rowToCardData, type CardProfileRow } from "../../../lib/card-profile";
import { fetchCardBranding, fetchOrganizationLinks } from "../../../lib/organizations/card-branding";
import { logCardView } from "../../../lib/analytics/card-views";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CardRow = {
  status: "UNASSIGNED" | "ACTIVE" | "LOST" | "DISABLED";
  owner_profile_id: string | null;
};

export default async function PhysicalCardRoute({ params }: { params: Promise<{ cardCode: string }> }) {
  const { cardCode } = await params;
  if (!/^YN-[A-Z0-9]{12}$/i.test(cardCode)) notFound();

  const admin = getSupabaseAdminClient();
  const normalizedCode = cardCode.toUpperCase();
  const { data: rawCard } = await admin
    .from("physical_cards")
    .select("status,owner_profile_id")
    .eq("card_code", normalizedCode)
    .maybeSingle();
  const card = rawCard as CardRow | null;

  if (!card) notFound();
  if (card.status === "LOST") return <CardState title="Bu Yenomi kartı kayıp olarak bildirilmiştir." />;
  if (card.status !== "ACTIVE") return <CardState title="Bu Yenomi kartı kullanım dışıdır." />;
  if (!card.owner_profile_id) return <CardState title="Bu Yenomi kartı henüz bir profile bağlı değildir." />;

  const { data: rawProfile } = await admin
    .from("card_profiles")
    .select("id,user_id,entitlement_id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,is_published,card_status,service_started_at,service_expires_at,grace_ends_at")
    .eq("id", card.owner_profile_id)
    .maybeSingle();
  const profile = rawProfile as CardProfileRow | null;

  if (!profile || !profile.is_published) return <CardState title="Bu Yenomi profili şu anda aktif değildir." />;
  if (profile.card_status === "LOST") return <CardState title="Bu Yenomi kartı kayıp olarak bildirilmiştir." />;
  if (profile.card_status !== "ACTIVE" || !isCardProfileServiceActive(profile)) return <CardState title="Bu Yenomi profili şu anda aktif değildir." />;

  await logCardView(profile.id);
  const branding = await fetchCardBranding(profile.user_id);
  const links = await fetchOrganizationLinks(profile.user_id, profile.id);

  return (
    <main className="p12-public-card-page">
      <PublicProfileProtection profileId={profile.public_id || profile.id.slice(0, 8)} generatedAt={new Date().toISOString()} />
      <CardTemplate data={{ ...rowToCardData(profile), links }} slug={`c/${normalizedCode}`} branding={branding} />
    </main>
  );
}

function CardState({ title }: { title: string }) {
  return <main id="main-content" className="profile-state-page p12-profile-state"><section><span>YENOMI ID</span><h1>{title}</h1><p>Kart sahibinin iletişim bilgileri güvenlik nedeniyle gösterilmemektedir.</p></section></main>;
}
