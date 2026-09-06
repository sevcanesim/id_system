import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";
import { recordSystemError } from "../../../../lib/observability/system-errors";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({ type: z.enum(["ACCESS", "ERASURE"]) });

export async function GET(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("privacy_requests")
    .select("id,request_type,status,identity_verified_at,resolved_at,resolution_code,created_at,updated_at")
    .eq("user_id", identity.user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    await recordSystemError({ source: "PRIVACY_REQUESTS", errorCode: "PRIVACY_REQUEST_LIST_FAILED", message: "Privacy request list could not be loaded.", userId: identity.user.id });
    return NextResponse.json({ error: "Gizlilik talepleri şu anda yüklenemedi." }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const identity = await resolveRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Talep türü geçersiz." }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("submit_privacy_request", {
    p_user_id: identity.user.id,
    p_request_type: parsed.data.type,
  });
  const result = data as { ok?: boolean; duplicate?: boolean; code?: string; request?: unknown } | null;

  if (error || !result?.ok) {
    await recordSystemError({ source: "PRIVACY_REQUESTS", errorCode: result?.code ?? "PRIVACY_REQUEST_CREATE_FAILED", message: "Privacy request could not be created.", userId: identity.user.id });
    return NextResponse.json({ error: "Talebiniz şu anda oluşturulamadı." }, { status: 500 });
  }

  return NextResponse.json({ request: result.request, duplicate: Boolean(result.duplicate) }, { status: result.duplicate ? 200 : 201 });
}
