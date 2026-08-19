import { notFound } from "next/navigation";
import PublicProfileProtection from "../../components/security/PublicProfileProtection";
import PublicCardWithNetworking from "../../components/public/PublicCardWithNetworking";
import { getPublicSupabaseClient } from "../../../lib/supabase/public";
import { isCardProfileServiceActive, rowToCardData, type CardProfileRow } from "../../../lib/card-profile";
import { fetchCardBranding, fetchOrganizationLinks } from "../../../lib/organizations/card-branding";
import { fetchCardLocaleOverlays } from "../../../lib/public-card/locales";
import { logCardView } from "../../../lib/analytics/card-views";

export const dynamic = "force-dynamic";

type EventLinkRow = {
  id: string;
  event_id: string;
  profile_id: string;
  networking_events: { name: string | null } | { name: string | null }[] | null;
};

export default async function EventAttributionPage({ params }: { params: Promise<{ eventPublicId: string }> }) {
  const { eventPublicId } = await params;
  const supabase = getPublicSupabaseClient();
  if (!supabase) notFound();

  const { data: link } = await supabase
    .from("networking_event_links")
    .select("id,event_id,profile_id,networking_events(name)")
    .eq("public_id", eventPublicId)
    .maybeSingle();
  const eventLink = link as EventLinkRow | null;
  if (!eventLink) notFound();

  const { data: profile } = await supabase
    .from("card_profiles")
    .select("id,user_id,organization_id,entitlement_id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,bio,is_published,card_status,service_started_at,service_expires_at,grace_ends_at")
    .eq("id", eventLink.profile_id)
    .maybeSingle();
  const card = profile as CardProfileRow | null;
  if (!card || !card.is_published || card.card_status !== "ACTIVE" || !isCardProfileServiceActive(card)) notFound();

  await logCardView(card.id);
  const branding = await fetchCardBranding(card.user_id);
  const links = await fetchOrganizationLinks(card.user_id, card.id);
  const locales = await fetchCardLocaleOverlays(supabase, card.id);
  const eventRel = eventLink.networking_events;
  const eventName = Array.isArray(eventRel) ? eventRel[0]?.name : eventRel?.name;

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
        eventName={eventName || "Event"}
        source="EVENT"
        locales={locales}
      />
    </main>
  );
}
