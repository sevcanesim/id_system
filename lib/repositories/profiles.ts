import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardProfileRow } from "../card-profile";
import { normalizeCardSlug, validateCardSlug } from "../validation/slug";

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
  "id,user_id,organization_id,entitlement_id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,bio,is_published,card_status,service_started_at,service_expires_at,grace_ends_at";

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

export async function fetchProfileBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ data: CardProfileRow | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_public_card_profile", {
    p_slug: slug,
    p_public_id: null,
  });
  const profile = Array.isArray(data) ? data[0] : data;
  return { data: (profile as CardProfileRow | null) ?? null, error: error?.message ?? null };
}

export async function fetchProfileByPublicId(
  supabase: SupabaseClient,
  publicId: string
): Promise<{ data: CardProfileRow | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_public_card_profile", {
    p_slug: null,
    p_public_id: publicId,
  });
  const profile = Array.isArray(data) ? data[0] : data;
  return { data: (profile as CardProfileRow | null) ?? null, error: error?.message ?? null };
}

export async function fetchPublicCardByToken(
  supabase: SupabaseClient,
  token: string
): Promise<{ data: CardProfileRow | null; redirectedFrom?: string; error: string | null }> {
  const byId = await fetchProfileByPublicId(supabase, token);
  if (byId.data) return byId;
  const bySlug = await fetchProfileBySlug(supabase, token);
  if (bySlug.data) return bySlug;
  const { data: redirectRow } = await supabase
    .from("card_profile_slug_redirects")
    .select("profile_id")
    .eq("old_slug", token)
    .maybeSingle();
  if (!redirectRow?.profile_id) return { data: null, error: bySlug.error };
  const { data: profile } = await supabase
    .from("card_profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", redirectRow.profile_id)
    .maybeSingle();
  if (!profile) return { data: null, error: null };
  return { data: profile as CardProfileRow, redirectedFrom: token, error: null };
}

export async function setProfilePublished(
  supabase: SupabaseClient,
  userId: string,
  profileId: string,
  isPublished: boolean
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from("card_profiles")
    .update({ is_published: isPublished })
    .eq("id", profileId)
    .eq("user_id", userId)
    .select("id,is_published")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Kart durumu veritabanında güncellenmedi. Lütfen oturumunu yenileyip tekrar dene." };
  if (Boolean(data.is_published) !== isPublished) return { error: "Kart durumu doğrulanamadı. Lütfen tekrar dene." };
  return { error: null };
}

/**
 * Direct `card_profiles` insert/update plus slug-redirect writes.
 * `profileId` updates that row (with owner check); `null` inserts a new
 * profile instead of upserting on `user_id`.
 *
 * Live CardWizard saves go through `POST /api/profiles/save` → RPC
 * `save_own_card_profile` (service role), which enforces org field locks
 * and the title catalog. Do not call this from the wizard — that would
 * bypass server authorization.
 */
export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  profileId: string | null,
  patch: Partial<Omit<CardProfileRow, "id" | "user_id">>
): Promise<{ data: { id: string } | null; error: string | null }> {
  if (typeof patch.slug === "string") {
    const normalizedSlug = normalizeCardSlug(patch.slug);
    const slugError = validateCardSlug(normalizedSlug);
    if (slugError) return { data: null, error: slugError };
    patch = { ...patch, slug: normalizedSlug };
  }
  if (profileId) {
    if (typeof patch.slug === "string") {
      const { data: current } = await supabase
        .from("card_profiles")
        .select("slug")
        .eq("id", profileId)
        .eq("user_id", userId)
        .maybeSingle();
      if (current?.slug && current.slug !== patch.slug) {
        await supabase.from("card_profile_slug_redirects").upsert({
          old_slug: current.slug,
          profile_id: profileId,
        });
      }
    }
    const { data, error } = await supabase
      .from("card_profiles")
      .update(patch)
      .eq("id", profileId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    return { data: (data as { id: string } | null) ?? null, error: error?.message ?? null };
  }
  const { data, error } = await supabase
    .from("card_profiles")
    .insert({ user_id: userId, ...patch })
    .select("id")
    .maybeSingle();
  return { data: (data as { id: string } | null) ?? null, error: error?.message ?? null };
}
