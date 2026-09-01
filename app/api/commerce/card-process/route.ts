import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { publicError } from "../../../../lib/errors";

export const runtime = "nodejs";

const completeSchema = z.object({ profileId: z.string().uuid() });

async function authenticatedUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function resolveOwnUnit(userId: string, profileId?: string) {
  const admin = getSupabaseAdminClient();

  let entitlementId: string | null = null;
  if (profileId) {
    const { data: profile } = await admin
      .from("card_profiles")
      .select("id,entitlement_id")
      .eq("id", profileId)
      .eq("user_id", userId)
      .maybeSingle();
    entitlementId = profile?.entitlement_id ?? null;
    if (!profile) return { admin, unit: null, entitlement: null, order: null, profileFound: false };
  }

  let entitlementQuery = admin
    .from("entitlements")
    .select("id,order_item_id,expires_at,grace_ends_at,package_code,status,created_at")
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "GRACE_PERIOD"])
    .not("order_item_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (entitlementId) entitlementQuery = entitlementQuery.eq("id", entitlementId);
  const { data: entitlement } = await entitlementQuery.maybeSingle();
  if (!entitlement?.order_item_id) return { admin, unit: null, entitlement: entitlement ?? null, order: null, profileFound: true };

  const [{ data: unit }, { data: orderItem }] = await Promise.all([
    admin
      .from("commerce_physical_card_units")
      .select("id,order_item_id,operations_status,print_requested_at,print_started_at,print_approved_at,carrier,tracking_number,shipped_at,out_for_delivery_at,delivered_at,created_at,updated_at")
      .eq("order_item_id", entitlement.order_item_id)
      .order("instance_no", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("commerce_order_items")
      .select("order_id")
      .eq("id", entitlement.order_item_id)
      .maybeSingle(),
  ]);

  let order = null;
  if (orderItem?.order_id) {
    const { data } = await admin
      .from("commerce_orders")
      .select("id,order_number,status,total_kurus,currency,paid_at,created_at,tracking_company,tracking_number,shipped_at,delivered_at")
      .eq("id", orderItem.order_id)
      .eq("user_id", userId)
      .maybeSingle();
    order = data ?? null;
  }

  return { admin, unit: unit ?? null, entitlement, order, profileFound: true };
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

    const { admin, unit, entitlement, order } = await resolveOwnUnit(user.id);
    if (!unit) return NextResponse.json({ process: null, entitlement, order, events: [] });

    const { data: events } = await admin
      .from("commerce_physical_card_status_history")
      .select("id,from_status,to_status,source,note,metadata,created_at")
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ process: unit, entitlement, order, events: events ?? [] });
  } catch (error) {
    const payload = publicError("ORDER_LOAD_FAILED");
    console.error("own card process error", { reference: payload.reference, error });
    return NextResponse.json(payload, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json(publicError("AUTH_REQUIRED"), { status: 401 });

    const parsed = completeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz profil." }, { status: 400 });

    const { admin, unit, profileFound } = await resolveOwnUnit(user.id, parsed.data.profileId);
    if (!profileFound) return NextResponse.json({ error: "Profil bulunamadı." }, { status: 404 });
    if (!unit) {
      return NextResponse.json(
        { error: "Bu profile bağlı, ödemesi tamamlanmış fiziksel kart siparişi bulunamadı." },
        { status: 409 },
      );
    }

    const { data, error } = await admin.rpc("transition_physical_card_unit", {
      p_unit_id: unit.id,
      p_next_status: "PRINT_PENDING",
      p_actor_user_id: user.id,
      p_source: "CUSTOMER",
      p_carrier: null,
      p_tracking_number: null,
      p_note: "Profil tamamlandı; baskı kuyruğuna alındı.",
    });
    const result = data as { ok?: boolean; code?: string; current?: string; from?: string; to?: string } | null;
    if (error || !result?.ok) {
      console.error("mark card print pending failed", { error, result });
      return NextResponse.json({ error: result?.code ?? "Kart baskı kuyruğuna alınamadı.", current: result?.current }, { status: 409 });
    }

    return NextResponse.json({ ok: true, process: result });
  } catch (error) {
    console.error("card process completion error", error);
    return NextResponse.json({ error: "Kart süreci güncellenemedi." }, { status: 500 });
  }
}
