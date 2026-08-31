import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const auth = getSupabaseAuthClient();
  const { data: authData } = await auth.auth.getUser(token);
  if (!authData.user) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

  const management = request.nextUrl.searchParams.get("management") === "true";
  const admin = getSupabaseAdminClient();
  let membershipQuery = admin
    .from("organization_members")
    .select("organization_id,role,status,department,organizations(id,name,slug,status)")
    .eq("user_id", authData.user.id)
    .eq("status", "ACTIVE");

  if (management) membershipQuery = membershipQuery.in("role", ["OWNER", "ADMIN", "HR", "DEPARTMENT_MANAGER"]);

  const { data: memberships, error: membershipError } = await membershipQuery;
  if (membershipError) return NextResponse.json({ error: "Şirket erişimi doğrulanamadı." }, { status: 500 });
  if (management && !memberships?.length) {
    return NextResponse.json({ error: "Bu hesapta aktif şirket yönetim yetkisi bulunmuyor." }, { status: 403 });
  }

  const organizationIds = (memberships || []).map((membership) => membership.organization_id);
  const [subscriptions, entitlements] = organizationIds.length
    ? await Promise.all([
        admin
          .from("organization_subscriptions")
          .select("organization_id,seat_limit,status,expires_at,business_plans(name,code)")
          .in("organization_id", organizationIds)
          .in("status", ["ACTIVE", "GRACE_PERIOD"]),
        admin
          .from("organization_entitlements")
          .select("organization_id,mail_credit_limit,mail_credits_remaining")
          .in("organization_id", organizationIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (subscriptions.error) return NextResponse.json({ error: "Şirket aboneliği yüklenemedi." }, { status: 500 });
  if (entitlements.error) return NextResponse.json({ error: "Şirket kullanım hakları yüklenemedi." }, { status: 500 });

  return NextResponse.json({
    organizations: (memberships || []).map((membership) => ({
      ...membership,
      organization_subscriptions: (subscriptions.data || []).filter(
        (subscription) => subscription.organization_id === membership.organization_id,
      ),
      organization_entitlements: (entitlements.data || []).find(
        (entitlement) => entitlement.organization_id === membership.organization_id,
      ) || null,
    })),
  });
}
