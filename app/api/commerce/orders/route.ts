import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient } from "../../../../lib/supabase/server-admin";
import { publicError } from "../../../../lib/errors";
import { recordSystemError } from "../../../../lib/observability/system-errors";
import { resolveRequestIdentity } from "../../../../lib/auth/request-identity";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const context = await resolveRequestIdentity(request);
    if (!context) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

    // Customer-owned reads use the JWT so RLS remains authoritative. Physical
    // card units inherit ownership through commerce_order_items -> commerce_orders.
    const supabase = getSupabaseUserClient(context.accessToken);
    const { data, error } = await supabase
      .from("commerce_orders")
      .select("id,order_number,status,total_kurus,currency,paid_at,created_at,updated_at,tracking_company,tracking_number,shipped_at,delivered_at,customer_name,customer_phone,commerce_order_items(id,product_name,product_kind,quantity,unit_price_kurus,configuration,commerce_physical_card_units(id,operations_status,print_requested_at,print_started_at,print_approved_at,carrier,tracking_number,shipped_at,out_for_delivery_at,delivered_at)),shipping_addresses(recipient_name,phone,address_line,district,city,postal_code)")
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      const payload = publicError("ORDER_LOAD_FAILED");
      void recordSystemError({
        source: "COMMERCE_ORDERS",
        errorCode: "ORDER_QUERY_FAILED",
        message: "Hesaba ait siparişler sorgulanamadı.",
        requestId: payload.reference,
        userId: context.user.id,
      });
      return NextResponse.json(payload, { status: 500 });
    }
    return NextResponse.json({ orders: data ?? [] });
  } catch {
    const payload = publicError("ORDER_LOAD_FAILED");
    void recordSystemError({
      source: "COMMERCE_ORDERS",
      errorCode: "ORDER_LOAD_FAILED",
      message: "Hesaba ait siparişler yüklenemedi.",
      requestId: payload.reference,
    });
    return NextResponse.json(payload, { status: 500 });
  }
}
