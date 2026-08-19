import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ admin: false }, { status: 401 });
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return NextResponse.json({ admin: false }, { status: 401 });
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return NextResponse.json({ admin: Boolean(row) });
}
