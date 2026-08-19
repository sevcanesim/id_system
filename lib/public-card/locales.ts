import type { SupabaseClient } from "@supabase/supabase-js";
import type { NetworkingLocale } from "../networking/catalog";

export type CardLocaleOverlay = {
  locale: NetworkingLocale;
  role: string | null;
  about: string | null;
};

export async function fetchCardLocaleOverlays(
  supabase: SupabaseClient,
  profileId: string,
): Promise<CardLocaleOverlay[]> {
  const { data } = await supabase
    .from("card_profile_locales")
    .select("locale,role,about")
    .eq("profile_id", profileId);
  return ((data || []) as CardLocaleOverlay[]).filter((row) => row.locale === "tr" || row.locale === "en");
}
