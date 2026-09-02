import { notFound } from "next/navigation";
import PublicProfileProtection from "../../components/security/PublicProfileProtection";
import PublicCardWithNetworking from "../../components/public/PublicCardWithNetworking";
import { getPublicSupabaseClient } from "../../../lib/supabase/public";
import { getSupabaseAdminClient } from "../../../lib/supabase/server-admin";
import { isCardProfileServiceActive, rowToCardData, type CardProfileRow } from "../../../lib/card-profile";
import { fetchCardBranding, fetchOrganizationLinks } from "../../../lib/organizations/card-branding";
import { fetchCardLocaleOverlays } from "../../../lib/public-card/locales";
import { logCardView } from "../../../lib/analytics/card-views";

export const dynamic = "force-dynamic";

type EventLinkRow = {
  id: string;
  event_id: string;
  profile_id: string;
  event_name: string | null;
};

export default async function EventAttributionPage({ params }: { params: Promise<{ eventPublicId: string }> }) {
  const { eventPublicId } = await params;
  const supabase = getPublicSupabaseClient();
  if (!supabase) notFound();

  const { data: resolvedLinks } = await supabase.rpc("resolve_public_networking_event_link", {
    p_public_id: eventPublicId,
  });
  const eventLink = (Array.isArray(resolvedLinks) ? resolvedLinks[0] : resolvedLinks) as EventLinkRow | null;
  if (!eventLink) notFound();

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("card_profiles")
    .select("id,user_id,organization_id,entitlement_id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,bio,is_published,card_status,service_started_at,service_expires_at,grace_ends_at")
    .eq("id", eventLink.profile_id)
    .maybeSingle();
  const card = profile as CardProfileRow | null;
  if (!card || !card.is_published || card.card_status !== "ACTIVE" || !isCardProfileServiceActive(card)) notFound();

  await logCardView(card.id);
  const branding = await fetchCardBranding(card.user_id);
  const links = await fetchOrganizationLinks(card.user_id, card.id, card.organization_id);
  const locales = await fetchCardLocaleOverlays(supabase, card.id);

  return (
    <main id="main-content" className="p12-public-card-page">
      <PublicProfileProtection profileId={card.public_id || card.id.slice(0, 8)} generatedAt={new Date().toISOString()} />
      <PublicCardWithNetworking
        data={{ ...rowToCardData(card), links }}
        slug={card.slug}
        publicId={card.public_id}
        branding={branding}
        profileId={card.id}
        profileName={card.name}
        organizationName={card.company || branding?.companyName}
        eventId={eventLink.event_id}
        eventName={eventLink.event_name || "Event"}
        source="EVENT"
        locales={locales}
      />
    </main>
  );
}
