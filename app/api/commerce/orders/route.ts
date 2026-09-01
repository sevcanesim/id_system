import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthClient, getSupabaseUserClient } from "../../../../lib/supabase/server-admin";
import { publicError } from "../../../../lib/errors";

export const runtime = "nodejs";

async function getAuthenticatedContext(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;

  return { user: data.user, token };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthenticatedContext(request);
    if (!context) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

    // Customer-owned reads use the JWT so RLS remains authoritative. Physical
    // card units inherit ownership through commerce_order_items -> commerce_orders.
    const supabase = getSupabaseUserClient(context.token);
    const { data, error } = await supabase
      .from("commerce_orders")
      .select("id,order_number,status,total_kurus,currency,paid_at,created_at,updated_at,tracking_company,tracking_number,shipped_at,delivered_at,customer_name,customer_phone,commerce_order_items(id,product_name,product_kind,quantity,unit_price_kurus,configuration,commerce_physical_card_units(id,operations_status,print_requested_at,print_started_at,print_approved_at,carrier,tracking_number,shipped_at,out_for_delivery_at,delivered_at)),shipping_addresses(recipient_name,phone,address_line,district,city,postal_code)")
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      const payload = publicError("ORDER_LOAD_FAILED");
      console.error("commerce own orders query error", { reference: payload.reference, error });
      return NextResponse.json(payload, { status: 500 });
    }
    return NextResponse.json({ orders: data ?? [] });
  } catch (error) {
    const payload = publicError("ORDER_LOAD_FAILED");
    console.error("commerce own orders error", { reference: payload.reference, error });
    return NextResponse.json(payload, { status: 500 });
  }
}
