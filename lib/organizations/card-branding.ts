import { getSupabaseAdminClient } from "../supabase/server-admin";
import type { CardBranding, CardTemplateLink } from "../../app/CardTemplate";

// Bir kullanıcının kurumsal kimliğini (organizationId) bulur; hem
// branding hem de kurumsal bağlantılar aynı üyelik satırından türer.
async function resolveOrganizationId(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string): Promise<string | null> {
  const { data } = await admin.from("organization_members").select("organization_id").eq("user_id", userId).eq("status", "ACTIVE").limit(1).maybeSingle();
  return data?.organization_id ?? null;
}

// İK'nın Ayarlar panelinden yapılandırdığı 4 sabit kurumsal bağlantı
// slotunu (Ürün Kataloğu, Şirket Sunumu, Toplantı Planla, Referans
// Projeler) genel kart şablonunun `data.links` biçimine çevirir. Hiç
// yapılandırılmamış şirketler için boş dizi döner — CardTemplate bu
// durumda kendi statik yer tutucularını gösterir.
export async function fetchOrganizationLinks(userId: string | null | undefined, profileId?: string | null): Promise<CardTemplateLink[]> {
  if (!userId) return [];
  try {
    const admin = getSupabaseAdminClient();
    const organizationId = await resolveOrganizationId(admin, userId);
    if (!organizationId) return [];
    const { data } = await admin.from("organization_links").select("id,kind,label,subtitle,link_type,url,file_path,is_published,publish_at").eq("organization_id", organizationId).eq("is_published", true).or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`);
    if (!data?.length) return [];
    const { data: slotDefinitions, error: slotError } = await admin
      .from("organization_link_slot_definitions")
      .select("kind,default_label,default_subtitle,icon")
      .eq("is_active", true)
      .order("sort_order");
    if (slotError || !slotDefinitions?.length) return [];
    const byKind = new Map(data.map((row) => [row.kind, row]));
    return slotDefinitions.map((definition) => {
      const row = byKind.get(definition.kind);
      if (!row) return null;
      const hasTarget = row.link_type === "FILE" ? row.file_path : row.url;
      if (!hasTarget) return null;
      const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
      return {
        title: row.label || definition.default_label,
        subtitle: row.subtitle || definition.default_subtitle,
        href: `/api/organization-links/${row.id}/open${query}`,
        kind: definition.icon as CardTemplateLink["kind"],
      } satisfies CardTemplateLink;
    }).filter((link): link is CardTemplateLink => Boolean(link));
  } catch {
    return [];
  }
}

// Resolves the corporate branding that should be applied to a given user's
// public card: the default card template of the organization they are an
// ACTIVE member of.
//
// Returns null for individual (non-corporate) users, which is the common
// case — those cards keep the standard Yenomi appearance. Failures are
// swallowed and treated as "no branding" so a branding lookup can never
// prevent a card from rendering.
export async function fetchCardBranding(userId: string | null | undefined): Promise<CardBranding | null> {
  if (!userId) return null;
  try {
    const admin = getSupabaseAdminClient();

    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id,organizations(name)")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();
    if (!membership?.organization_id) return null;

    const { data: template } = await admin
      .from("organization_card_templates")
      .select("primary_color,logo_url,fields")
      .eq("organization_id", membership.organization_id)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();
    if (!template) return null;

    const organization = membership.organizations as unknown as { name?: string } | null;
    return {
      logoUrl: template.logo_url ?? null,
      primaryColor: template.primary_color ?? null,
      companyName: organization?.name ?? null,
      variant: (() => {
        const fields = (template.fields || {}) as Record<string, unknown>;
        const value = typeof fields.templateVariant === "string" ? fields.templateVariant : "ESSENTIAL";
        if (value === "CLASSIC") return "ESSENTIAL";
        if (value === "MINIMAL") return "PROFESSIONAL";
        return (["ESSENTIAL", "PROFESSIONAL", "EXECUTIVE"].includes(value) ? value : "ESSENTIAL") as CardBranding["variant"];
      })(),
    };
  } catch {
    return null;
  }
}
