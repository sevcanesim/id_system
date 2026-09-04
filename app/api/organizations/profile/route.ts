import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

const selectFields = "id,name,slug,status,legal_name,tax_id_type,tax_number,tax_office,mersis_number,trade_registry_number,billing_address,billing_city,billing_district,billing_postal_code,billing_country_code,billing_email,billing_phone,authorized_person_name,updated_at";

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function membership(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status").eq("organization_id", organizationId).eq("user_id", userId).eq("status", "ACTIVE").maybeSingle();
  return data && isOrganizationRole(data.role) ? data : null;
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return NextResponse.json({ error: "Geçerli şirket kimliği gerekli." }, { status: 400 });
  const member = await membership(ctx.admin, ctx.user.id, organizationId);
  if (!member) return NextResponse.json({ error: "Şirket erişimi bulunamadı." }, { status: 403 });
  const { data, error } = await ctx.admin.from("organizations").select(selectFields).eq("id", organizationId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Şirket profili okunamadı." }, { status: 404 });
  return NextResponse.json({ organization: data, canEdit: false });
}

export async function PATCH() {
  return NextResponse.json({
    error: "Resmî şirket bilgileri aktivasyon kaydından gelir ve değiştirilemez.",
    code: "ORGANIZATION_LEGAL_PROFILE_LOCKED",
  }, { status: 403 });
}
