import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { publicError } from "../../../../lib/errors";
import { INDIVIDUAL_PRODUCT_PURCHASE_HREF } from "../../../../lib/commerce/individual-portal-access";
import { recordSystemError } from "../../../../lib/observability/system-errors";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.getUser(accessToken);
    if (error || !data.user) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

    const admin = getSupabaseAdminClient();
    const now = new Date().toISOString();
    const [{ data: entitlements, error: entitlementError }, { data: adminGrants, error: grantError }] = await Promise.all([
      admin
        .from("entitlements")
        .select("id,kind,status,starts_at,expires_at,grace_ends_at,order_item_id,package_code,network_mail_limit,network_mail_remaining")
        .eq("user_id", data.user.id)
        .in("kind", ["BUSINESS_CARD", "NFC_PHYSICAL_CARD"])
        .in("status", ["ACTIVE", "EXPIRED", "PENDING_ACTIVATION"])
        .order("expires_at", { ascending: false, nullsFirst: true }),
      admin
        .from("admin_access_grants")
        .select("id,package_code,starts_at,expires_at,network_mail_limit,network_mail_remaining")
        .eq("user_id", data.user.id)
        .eq("scope", "INDIVIDUAL")
        .eq("status", "ACTIVE")
        .lte("starts_at", now),
    ]);

    if (entitlementError || grantError) {
      void recordSystemError({
        source: "COMMERCE_ENTITLEMENTS",
        errorCode: "ENTITLEMENT_LOOKUP_FAILED",
        message: "Dijital hizmet kayıtları yüklenemedi.",
        userId: data.user.id,
      });
      return NextResponse.json(publicError("ORDER_FETCH_FAILED"), { status: 500 });
    }

    const activeAdminGrants = (adminGrants ?? [])
      .filter((grant) => !grant.expires_at || grant.expires_at > now)
      .map((grant) => ({
        id: grant.id,
        kind: "BUSINESS_CARD",
        status: "ACTIVE",
        starts_at: grant.starts_at,
        expires_at: grant.expires_at,
        grace_ends_at: null,
        order_item_id: null,
        package_code: grant.package_code,
        network_mail_limit: grant.network_mail_limit,
        network_mail_remaining: grant.network_mail_remaining,
        source: "ADMIN_GRANT" as const,
      }));
    const rows = [...(entitlements ?? []), ...activeAdminGrants];
    const activeEntitlements = rows.filter((item) => {
      if (item.status !== "ACTIVE") return false;
      if (!item.expires_at) return true;
      if (item.expires_at > now) return true;
      return Boolean(item.grace_ends_at && item.grace_ends_at > now);
    });
    const renewalEntitlements = rows.filter((item) => item.status === "ACTIVE" || item.status === "EXPIRED");
    const pendingEntitlements = rows.filter((item) => item.status === "PENDING_ACTIVATION");
    const active = activeEntitlements.length > 0;
    return NextResponse.json({
      active,
      entitlements: activeEntitlements,
      renewalEntitlements,
      pendingEntitlements,
      next: active ? "/olustur" : INDIVIDUAL_PRODUCT_PURCHASE_HREF,
    });
  } catch {
    void recordSystemError({
      source: "COMMERCE_ENTITLEMENTS",
      errorCode: "ENTITLEMENT_ACCESS_FAILED",
      message: "Dijital hizmet kayıtlarına erişilemedi.",
    });
    return NextResponse.json(publicError("ORDER_FETCH_FAILED"), { status: 500 });
  }
}
