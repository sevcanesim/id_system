import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardProfileRow } from "../card-profile";

/**
 * `card_profiles` tablosuna erişimi tek yerde toplar. Sayfa bileşenleri
 * artık `.from("card_profiles")` çağrılarını doğrudan yapmaz; bu repository
 * üzerinden geçer. Böylece sorgu şekli (seçilen kolonlar, filtreler) tek bir
 * yerden değişir ve birim testleri bu katmana yazılabilir.
 *
 * v23.2: bir kullanıcı artık birden fazla card_profiles satırına sahip
 * olabilir (örn. kartvizit + sağlık kartı + ikinci bir kartvizit). Bu yüzden
 * "own profile" tekil değil bir liste; okuma/yazma/güncelleme işlemleri artık
 * `user_id` yerine profilin kendi `id`'siyle (owner kontrolüyle birlikte)
 * hedefleniyor. `fetchOwnProfile` (tekil) geriye dönük uyumluluk için
 * korunuyor: listedeki ilk (en eski) profili döner.
 *
 * Denetim raporu referansı: P1 — "Veri erişimi sayfa bileşenlerine
 * dağılmış. `profiles`, `orders`, `payments`, `auth` repository/service
 * katmanı oluşturulmalı."
 */

const PROFILE_COLUMNS =
  "id,user_id,organization_id,entitlement_id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,bio,is_published,card_status,service_started_at,service_expires_at,grace_ends_at,search_indexing_enabled";

export async function fetchOwnProfiles(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: CardProfileRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("card_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return { data: (data as CardProfileRow[] | null) ?? [], error: error?.message ?? null };
}

/** Geriye dönük uyumluluk: kullanıcının ilk (en eski) kartını döner. */
export async function fetchOwnProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: CardProfileRow | null; error: string | null }> {
  const { data, error } = await fetchOwnProfiles(supabase, userId);
  return { data: data[0] ?? null, error };
}

export async function fetchOwnProfileById(
  supabase: SupabaseClient,
  userId: string,
  profileId: string
): Promise<{ data: CardProfileRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("card_profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", profileId)
    .eq("user_id", userId)
    .maybeSingle();
  return { data: (data as CardProfileRow | null) ?? null, error: error?.message ?? null };
}

export async function fetchOwnProfileByOrganizationId(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<{ data: CardProfileRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("card_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return { data: (data as CardProfileRow | null) ?? null, error: error?.message ?? null };
}
