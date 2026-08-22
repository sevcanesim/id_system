import { getSupabaseUserClient } from "../supabase/server-admin";

export async function readAccountType(accessToken: string, userId: string): Promise<string | null> {
  try {
    const client = getSupabaseUserClient(accessToken);
    const { data } = await client.from("user_accounts").select("account_type").eq("id", userId).maybeSingle();
    return typeof data?.account_type === "string" ? data.account_type : null;
  } catch {
    return null;
  }
}
