import { getSupabaseBrowserClient } from "../supabase/browser";

/**
 * Reads the current Supabase browser session and returns the access token
 * (for Authorization headers) plus the signed-in user id, if any. Shared by
 * client components that need a bearer token for authenticated fetches —
 * do not duplicate this getSession() call per-component.
 */
export async function getBrowserSession(): Promise<{
  accessToken: string | null;
  userId: string | null;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return {
    accessToken: data.session?.access_token ?? null,
    userId: data.session?.user?.id ?? null,
  };
}
