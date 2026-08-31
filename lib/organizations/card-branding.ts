import { getSupabaseAdminClient } from "../supabase/server-admin";
import type { CardBranding, CardTemplateLink } from "../../app/CardTemplate";

async function resolveOrganizationId(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string): Promise<string | null> {
  const { data } = await admin.from("organization_members").select("organization_id").eq("user_id", userId).eq("status", "ACTIVE").limit(1).maybeSingle();
  return data?.organization_id ?? null;
}

const FALLBACK_SLOT_DEFINITIONS = [
  { kind: "CATALOG", default_label: "Ürün Kataloğu", default_subtitle: "Kurumsal ürün ve hizmetler" },
  { kind: "PRESENTATION", default_label: "Şirket Sunumu", default_subtitle: "Kurumsal sunum" },
  { kind: "MEETING", default_label: "Toplantı Planla", default_subtitle: "Takvimden uygun zamanı seçin" },
  { kind: "REFERENCES", default_label: "Referans Projeler", default_subtitle: "Projeleri incele" },
] as const;

export async function fetchOrganizationLinks(
  userId: string | null | undefined,
  profileId?: string | null,
  profileOrganizationId?: string | null,
): Promise<CardTemplateLink[]> {
  if (!userId && !profileOrganizationId) return [];
  try {
    const admin = getSupabaseAdminClient();
    const organizationId = profileOrganizationId || (userId ? await resolveOrganizationId(admin, userId) : null);
    if (!organizationId) return [];

    const { data } = await admin
      .from("organization_links")
      .select("id,kind,label,subtitle,link_type,url,file_path,is_published,publish_at")
      .eq("organization_id", organizationId)
      .eq("is_published", true)
      .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`);

    if (!data?.length) return [];

    const { data: databaseDefinitions } = await admin
      .from("organization_link_slot_definitions")
      .select("kind,default_label,default_subtitle")
      .eq("is_active", true)
      .order("sort_order");

    const databaseByKind = new Map((databaseDefinitions || []).map((definition) => [definition.kind, definition]));
    const definitions = FALLBACK_SLOT_DEFINITIONS.map((fallback) => databaseByKind.get(fallback.kind) || fallback);
    const byKind = new Map(data.map((row) => [row.kind, row]));

    return definitions.flatMap<CardTemplateLink>((definition) => {
      const row = byKind.get(definition.kind);
      if (!row) return [];
      if (definition.kind === "MEETING" && row.link_type === "FILE") return [];

      const hasTarget = row.link_type === "FILE" ? row.file_path : row.url;
      if (!hasTarget) return [];

      const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
      return [{
        title: row.label || definition.default_label,
        subtitle: row.subtitle || definition.default_subtitle,
        href: `/api/organization-links/${row.id}/open${query}`,
        kind: "external",
      }];
    });
  } catch {
    return [];
  }
}

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
