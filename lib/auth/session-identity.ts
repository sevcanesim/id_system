import { getSupabaseUserClient } from "../supabase/server-admin";

export async function readAccountRecord(accessToken: string, userId: string): Promise<{
  accountType: string | null;
  testLoginScope: string | null;
}> {
  try {
    const client = getSupabaseUserClient(accessToken);
    const { data } = await client
      .from("user_accounts")
      .select("account_type,test_login_scope")
      .eq("id", userId)
      .maybeSingle();
    return {
      accountType: typeof data?.account_type === "string" ? data.account_type : null,
      testLoginScope: typeof data?.test_login_scope === "string" ? data.test_login_scope : null,
    };
  } catch {
    return { accountType: null, testLoginScope: null };
  }
}

export async function readAccountType(accessToken: string, userId: string): Promise<string | null> {
  const { accountType } = await readAccountRecord(accessToken, userId);
  return accountType;
}
