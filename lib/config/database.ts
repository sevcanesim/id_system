import { getSupabaseAdminClient } from "../supabase/server-admin";

export type DatabaseSeatPack = {
  seats: number;
  sku: string;
  name: string;
  priceKurus: number;
};

export type DatabaseTemplateOption = {
  value: "ESSENTIAL" | "PROFESSIONAL" | "EXECUTIVE";
  title: string;
  description: string;
};

export type DatabaseCatalogProduct = {
  slug: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  presentation: Record<string, unknown>;
  variants: Array<{ sku: string; name: string; priceKurus: number; metadata: Record<string, unknown> }>;
};

export async function getDatabaseCatalog(): Promise<DatabaseCatalogProduct[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("products")
    .select("slug,sku,name,description,category,status,presentation,product_variants(sku,name,price_kurus,metadata,is_active)")
    .eq("is_active", true);
  if (error) throw error;
  return (data || []).map((row) => ({
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    description: row.description,
    category: row.category,
    status: row.status,
    presentation: (row.presentation || {}) as Record<string, unknown>,
    variants: (row.product_variants || []).filter((variant) => variant.is_active).map((variant) => ({
      sku: variant.sku,
      name: variant.name,
      priceKurus: Number(variant.price_kurus),
      metadata: (variant.metadata || {}) as Record<string, unknown>,
    })),
  }));
}

export async function getDatabaseSeatPacks(): Promise<DatabaseSeatPack[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("product_variants")
    .select("sku,name,price_kurus,metadata,products!inner(slug)")
    .eq("products.slug", "yenomi-business-seat-pack")
    .eq("is_active", true);
  if (error) throw error;
  return (data || [])
    .map((row) => ({
      seats: Number((row.metadata as Record<string, unknown> | null)?.seat_count),
      sku: row.sku,
      name: row.name,
      priceKurus: Number(row.price_kurus),
    }))
    .filter((row) => Number.isInteger(row.seats) && row.seats > 0)
    .sort((a, b) => a.seats - b.seats);
}

export async function getDatabaseTemplateOptions(): Promise<DatabaseTemplateOption[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("corporate_template_options")
    .select("code,title,description")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data || []).filter((row): row is typeof row & { code: DatabaseTemplateOption["value"] } =>
    ["ESSENTIAL", "PROFESSIONAL", "EXECUTIVE"].includes(row.code),
  ).map((row) => ({ value: row.code, title: row.title, description: row.description }));
}

export async function getDatabaseLegalVersions() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("legal_documents")
    .select("code,version")
    .eq("is_active", true)
    .in("code", ["DISTANCE_SALES", "PERSONALIZATION", "PRIVACY"]);
  if (error) throw error;
  const versions = new Map((data || []).map((row) => [row.code, row.version]));
  const distanceSales = versions.get("DISTANCE_SALES");
  const personalization = versions.get("PERSONALIZATION");
  const privacy = versions.get("PRIVACY");
  if (!distanceSales || !personalization || !privacy) throw new Error("Aktif hukuk sürümleri DB'de eksik.");
  return { distanceSales, personalization, privacy };
}

export async function getDatabaseLifecycleSettings() {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("app_settings").select("value").eq("key", "commerce.service_lifecycle").single();
  if (error || !data) throw error || new Error("Hizmet yaşam döngüsü DB'de eksik.");
  const value = data.value as Record<string, unknown>;
  return {
    serviceTermDays: Number(value.serviceTermDays),
    graceDays: Number(value.graceDays),
    activationLinkDays: Number(value.activationLinkDays),
    activationResendHours: Number(value.activationResendHours),
    activationMaxDelayDays: Number(value.activationMaxDelayDays),
  };
}
