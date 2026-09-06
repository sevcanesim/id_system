import { isCardProfileServiceActive, type CardProfileRow } from "../card-profile";
import { profileImagePathFromValue, publicProfileImagePath } from "../profile-images";
import { getSupabaseAdminClient } from "../supabase/server-admin";

const PUBLIC_PROFILE_COLUMNS =
  "id,user_id,organization_id,entitlement_id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,bio,is_published,card_status,service_started_at,service_expires_at,grace_ends_at,search_indexing_enabled";

type PublicPhysicalState = "NOT_PHYSICAL" | "ACTIVE" | "LOST" | "DISABLED";

async function applyPhysicalCardState(profile: CardProfileRow) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("get_public_profile_physical_state", { p_profile_id: profile.id });
  if (error) return { data: null, error: error.message };

  const state = data as PublicPhysicalState | null;
  if (state === "LOST") return { data: { ...profile, card_status: "LOST" as const }, error: null };
  if (state === "DISABLED") return { data: { ...profile, card_status: "SUSPENDED" as const }, error: null };
  return { data: profile, error: null };
}

export function presentPublicProfileImage(profile: CardProfileRow): CardProfileRow {
  if (!profile.public_id || !profileImagePathFromValue(profile.image_url)) {
    return { ...profile, image_url: null };
  }
  return { ...profile, image_url: publicProfileImagePath(profile.public_id) };
}

function isSupportedPublicToken(token: string) {
  return /^[A-Za-z0-9_-]{3,128}$/.test(token);
}

export async function fetchPublicCardByToken(token: string): Promise<{
  data: CardProfileRow | null;
  redirectedFrom?: string;
  error: string | null;
}> {
  if (!isSupportedPublicToken(token)) return { data: null, error: null };

  const admin = getSupabaseAdminClient();
  const findPublishedProfile = (column: "id" | "public_id" | "slug", value: string) => admin
    .from("card_profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq(column, value)
    .eq("is_published", true)
    .maybeSingle();

  const { data: publicIdProfile, error: publicIdError } = await findPublishedProfile("public_id", token);
  if (publicIdError) return { data: null, error: publicIdError.message };
  if (publicIdProfile) {
    const checked = await applyPhysicalCardState(publicIdProfile as CardProfileRow);
    return { ...checked, data: checked.data ? presentPublicProfileImage(checked.data) : null };
  }

  const { data: slugProfile, error: slugError } = await findPublishedProfile("slug", token);
  if (slugError) return { data: null, error: slugError.message };
  if (slugProfile) {
    const checked = await applyPhysicalCardState(slugProfile as CardProfileRow);
    return { ...checked, data: checked.data ? presentPublicProfileImage(checked.data) : null };
  }

  const { data: redirect, error: redirectError } = await admin
    .from("card_profile_slug_redirects")
    .select("profile_id")
    .eq("old_slug", token)
    .maybeSingle();
  if (redirectError) return { data: null, error: redirectError.message };
  if (!redirect?.profile_id) return { data: null, error: null };

  const { data: redirectedProfile, error: redirectedProfileError } = await findPublishedProfile("id", redirect.profile_id);
  if (redirectedProfileError) return { data: null, error: redirectedProfileError.message };
  if (!redirectedProfile) return { data: null, error: null };

  const checked = await applyPhysicalCardState(redirectedProfile as CardProfileRow);
  if (!checked.data || !isCardProfileServiceActive(checked.data)) return checked;
  return { ...checked, data: checked.data ? presentPublicProfileImage(checked.data) : null, redirectedFrom: token };
}
