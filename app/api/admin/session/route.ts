import { NextRequest, NextResponse } from "next/server";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export async function GET(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return NextResponse.json({ admin: false }, { status: 401 });
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin.from("admin_users").select("user_id").eq("user_id", identity.user.id).maybeSingle();
  return NextResponse.json({ admin: Boolean(row) });
}
