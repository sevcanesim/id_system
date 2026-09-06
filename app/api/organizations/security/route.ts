import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assuranceLevelFromToken } from "../../../../lib/auth/assurance";
import { recordOrganizationAuditEvent } from "../../../../lib/organizations/audit";
import { requireOrganizationRole } from "../../../../lib/organizations/authorization";
import { readRequestAccessToken } from "../../../../lib/auth/request-identity";
import { getOrganizationSecurityPolicy, MFA_REQUIRED_MESSAGE } from "../../../../lib/organizations/security-policy";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

const updateSchema = z.object({
  organizationId: z.string().uuid(),
  requireMfaForCriticalActions: z.boolean(),
});

function tokenFrom(request: NextRequest) {
  return readRequestAccessToken(request) || "";
}

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId") || "";
  const actor = await requireOrganizationRole(request, organizationId, ["OWNER", "ADMIN", "HR"]);
  if (!actor) return NextResponse.json({ error: "Güvenlik ayarlarını görme yetkin yok." }, { status: 403 });

  try {
    const { policy, migrationPending } = await getOrganizationSecurityPolicy(getSupabaseAdminClient(), organizationId);
    return NextResponse.json({
      policy,
      migrationPending,
      permissions: { canManagePolicy: actor.role === "OWNER" },
      session: { assuranceLevel: assuranceLevelFromToken(tokenFrom(request)) },
    });
  } catch {
    return NextResponse.json({ error: "Güvenlik ayarları yüklenemedi." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz güvenlik ayarı." }, { status: 400 });

  const actor = await requireOrganizationRole(request, parsed.data.organizationId, ["OWNER"]);
  if (!actor) return NextResponse.json({ error: "Bu güvenlik politikasını yalnız şirket sahibi değiştirebilir." }, { status: 403 });
  if (assuranceLevelFromToken(tokenFrom(request)) !== "aal2") {
    return NextResponse.json({ error: MFA_REQUIRED_MESSAGE, code: "MFA_REQUIRED" }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("organization_security_policies").upsert({
    organization_id: parsed.data.organizationId,
    require_mfa_for_critical_actions: parsed.data.requireMfaForCriticalActions,
    updated_by: actor.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id" });
  if (error) {
    const migrationPending = error.code === "42P01" || error.code === "PGRST205";
    return NextResponse.json(
      { error: migrationPending ? "Güvenlik migration’ı henüz uygulanmadı." : "Güvenlik ayarı kaydedilemedi.", migrationPending },
      { status: migrationPending ? 409 : 500 },
    );
  }

  await recordOrganizationAuditEvent(admin, {
    organizationId: parsed.data.organizationId,
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "SECURITY_POLICY_CHANGED",
    subjectType: "SECURITY_POLICY",
    summary: parsed.data.requireMfaForCriticalActions
      ? "Kritik işlemler için MFA zorunluluğu etkinleştirildi."
      : "Kritik işlemler için MFA zorunluluğu kapatıldı.",
    metadata: { requireMfaForCriticalActions: parsed.data.requireMfaForCriticalActions },
  });

  return NextResponse.json({ ok: true });
}
