import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "../../../../lib/admin/require-admin";
import { recordSystemError } from "../../../../lib/observability/system-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusSchema = z.enum(["SUBMITTED", "IN_REVIEW", "IDENTITY_VERIFIED", "COMPLETED", "REJECTED", "CANCELLED"]);
const transitionSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["IN_REVIEW", "IDENTITY_VERIFIED", "COMPLETED", "REJECTED", "CANCELLED"]),
  resolutionCode: z.string().trim().regex(/^[A-Z0-9_:-]{3,80}$/).optional(),
});

export async function GET(request: NextRequest) {
  const context = await requireSuperAdmin(request);
  if (!context) return NextResponse.json({ error: "AAL2 doğrulamalı Super Admin yetkisi gerekli." }, { status: 403 });

  const status = statusSchema.safeParse(request.nextUrl.searchParams.get("status"));
  const query = context.admin
    .from("privacy_requests")
    .select("id,user_id,request_type,status,identity_verified_at,resolved_at,resolution_code,created_at,updated_at")
    .order("created_at", { ascending: true })
    .limit(200);
  if (status.success) query.eq("status", status.data);

  const { data: requests, error } = await query;
  if (error) {
    await recordSystemError({ source: "ADMIN_PRIVACY_REQUESTS", errorCode: "PRIVACY_REQUEST_ADMIN_LIST_FAILED", message: "Privacy request administration list could not be loaded.", userId: context.user.id });
    return NextResponse.json({ error: "Gizlilik talepleri yüklenemedi." }, { status: 500 });
  }

  const accountIds = [...new Set((requests ?? []).map((entry) => entry.user_id))];
  const { data: accounts, error: accountError } = accountIds.length
    ? await context.admin.from("user_accounts").select("id,yenomi_id,display_name,status").in("id", accountIds)
    : { data: [], error: null };
  if (accountError) {
    await recordSystemError({ source: "ADMIN_PRIVACY_REQUESTS", errorCode: "PRIVACY_REQUEST_ACCOUNT_LOOKUP_FAILED", message: "Privacy request account references could not be loaded.", userId: context.user.id });
    return NextResponse.json({ error: "Talep sahipleri yüklenemedi." }, { status: 500 });
  }

  const accountById = new Map((accounts ?? []).map((account) => [account.id, account]));
  return NextResponse.json({
    requests: (requests ?? []).map((entry) => ({ ...entry, account: accountById.get(entry.user_id) ?? null })),
  });
}

export async function PATCH(request: NextRequest) {
  const context = await requireSuperAdmin(request);
  if (!context) return NextResponse.json({ error: "AAL2 doğrulamalı Super Admin yetkisi gerekli." }, { status: 403 });

  const parsed = transitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Gizlilik talebi geçersiz." }, { status: 400 });

  const input = parsed.data;
  const { data, error } = await context.admin.rpc("admin_transition_privacy_request", {
    p_actor_user_id: context.user.id,
    p_request_id: input.requestId,
    p_next_status: input.status,
    p_resolution_code: input.resolutionCode ?? null,
  });
  const result = data as { ok?: boolean; code?: string; request?: unknown } | null;
  if (error || !result?.ok) {
    await recordSystemError({ source: "ADMIN_PRIVACY_REQUESTS", errorCode: result?.code ?? "PRIVACY_REQUEST_TRANSITION_FAILED", message: "Privacy request transition could not be completed.", userId: context.user.id });
    const messages: Record<string, string> = {
      REQUEST_NOT_FOUND: "Gizlilik talebi bulunamadı.",
      INVALID_TRANSITION: "Bu talep için seçilen durum geçişi uygun değil.",
      RESOLUTION_CODE_REQUIRED: "Tamamlanan veya reddedilen talepler için çözüm kodu gerekli.",
    };
    return NextResponse.json({ error: messages[result?.code ?? ""] ?? "Gizlilik talebi güncellenemedi." }, { status: 409 });
  }

  return NextResponse.json({ request: result.request });
}
