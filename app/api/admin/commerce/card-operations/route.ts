import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../../lib/supabase/server-admin";

const transitionSchema = z.object({
  unitId: z.string().uuid(),
  action: z.enum(["APPROVE_PRINT", "SHIP", "MARK_OUT_FOR_DELIVERY", "DELIVER"]),
  carrier: z.string().trim().min(2).max(80).optional(),
  trackingNumber: z.string().trim().min(3).max(120).optional(),
});

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return row ? { user: data.user, admin } : null;
}

export async function GET(request: NextRequest) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });

  const { data: units, error } = await context.admin
    .from("commerce_physical_card_units")
    .select("id,order_item_id,purpose,operational_status,print_requested_at,print_approved_at,shipping_pending_at,carrier,tracking_number,shipped_at,out_for_delivery_at,delivered_at,created_at")
    .in("operational_status", ["PRINT_PENDING", "SHIPPING_PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY"])
    .order("print_requested_at", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: "Kart operasyon kuyruğu yüklenemedi." }, { status: 500 });

  const itemIds = (units ?? []).map((unit) => unit.order_item_id);
  const { data: items } = itemIds.length
    ? await context.admin.from("commerce_order_items").select("id,order_id,product_name").in("id", itemIds)
    : { data: [] as Array<{ id: string; order_id: string; product_name: string }> };
  const orderIds = (items ?? []).map((item) => item.order_id);
  const { data: orders } = orderIds.length
    ? await context.admin.from("commerce_orders").select("id,order_number,user_id,guest_email,customer_name,paid_at,created_at").in("id", orderIds)
    : { data: [] as Array<{ id: string; order_number: string; user_id: string | null; guest_email: string; customer_name: string | null; paid_at: string | null; created_at: string }> };

  const itemMap = new Map((items ?? []).map((item) => [item.id, item]));
  const orderMap = new Map((orders ?? []).map((order) => [order.id, order]));
  const queue = (units ?? []).map((unit) => {
    const item = itemMap.get(unit.order_item_id);
    const order = item ? orderMap.get(item.order_id) : undefined;
    return { ...unit, productName: item?.product_name ?? null, order: order ?? null };
  });

  return NextResponse.json({ queue });
}

export async function PATCH(request: NextRequest) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });

  const parsed = transitionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz kart operasyonu." }, { status: 400 });
  if (parsed.data.action === "SHIP" && (!parsed.data.carrier || !parsed.data.trackingNumber)) {
    return NextResponse.json({ error: "Kargo firması ve takip numarası gerekli." }, { status: 400 });
  }

  const { data, error } = await context.admin.rpc("admin_transition_card_unit", {
    p_card_unit_id: parsed.data.unitId,
    p_actor_user_id: context.user.id,
    p_action: parsed.data.action,
    p_carrier: parsed.data.carrier ?? null,
    p_tracking_number: parsed.data.trackingNumber ?? null,
  });
  if (error) return NextResponse.json({ error: "Kart operasyonu güncellenemedi." }, { status: 500 });
  if (!data?.ok) return NextResponse.json({ error: data?.code ?? "INVALID_TRANSITION", state: data }, { status: 409 });

  await context.admin.from("admin_audit_log").insert({
    actor_user_id: context.user.id,
    action: `CARD_UNIT_${parsed.data.action}`,
    target_table: "commerce_physical_card_units",
    target_id: parsed.data.unitId,
    after_value: {
      status: data.status,
      carrier: parsed.data.carrier ?? null,
      trackingNumber: parsed.data.trackingNumber ?? null,
    },
  });

  return NextResponse.json({ ok: true, status: data.status });
}
