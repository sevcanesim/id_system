import type { NextRequest } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../supabase/server-admin";

export async function requireSuperAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;

  const admin = getSupabaseAdminClient();
  const { data: row } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!row) return null;
  return { user: data.user, admin };
}
