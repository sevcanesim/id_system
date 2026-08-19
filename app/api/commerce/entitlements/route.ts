import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { publicError } from "../../../../lib/errors";

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
    const { data: entitlements, error: entitlementError } = await admin
      .from("entitlements")
      .select("id,kind,status,starts_at,expires_at,grace_ends_at,order_item_id,package_code,network_mail_limit,network_mail_remaining")
      .eq("user_id", data.user.id)
      .in("kind", ["BUSINESS_CARD", "NFC_PHYSICAL_CARD"])
      .in("status", ["ACTIVE", "EXPIRED"])
      .order("expires_at", { ascending: false, nullsFirst: true });

    if (entitlementError) {
      console.error("entitlement lookup failed", entitlementError);
      return NextResponse.json(publicError("ORDER_FETCH_FAILED"), { status: 500 });
    }

    const rows = entitlements ?? [];
    const activeEntitlements = rows.filter((item) => {
      if (item.status !== "ACTIVE") return false;
      if (!item.expires_at) return true;
      if (item.expires_at > now) return true;
      return Boolean(item.grace_ends_at && item.grace_ends_at > now);
    });
    const active = activeEntitlements.length > 0;
    return NextResponse.json({
      active,
      entitlements: activeEntitlements,
      renewalEntitlements: rows,
      next: active ? "/olustur" : "/urunler?reason=access-required",
    });
  } catch (error) {
    console.error("entitlement access error", error);
    return NextResponse.json(publicError("ORDER_FETCH_FAILED"), { status: 500 });
  }
}
