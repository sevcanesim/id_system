import { getSupabaseAdminClient } from "../supabase/server-admin";
import { isCorporatePackageSku, isSeatPackSku } from "./packages";

function skuFromConfiguration(configuration: unknown): string | null {
  if (!configuration || typeof configuration !== "object") return null;
  const sku = (configuration as { sku?: unknown }).sku;
  return typeof sku === "string" ? sku : null;
}

function organizationIdFromConfiguration(configuration: unknown): string | null {
  if (!configuration || typeof configuration !== "object") return null;
  const organizationId = (configuration as { organizationId?: unknown }).organizationId;
  return typeof organizationId === "string" && organizationId.length > 0 ? organizationId : null;
}

function seatCountFromConfiguration(configuration: unknown): number | null {
  if (!configuration || typeof configuration !== "object") return null;
  const seatCount = (configuration as { seatCount?: unknown }).seatCount;
  return typeof seatCount === "number" && seatCount > 0 ? seatCount : null;
}

export function commerceOrderIsCorporate(items: Array<{ configuration?: unknown | null }>): boolean {
  return items.some((item) => isCorporatePackageSku(skuFromConfiguration(item.configuration)));
}

export function commerceOrderCorporateReady(items: Array<{ configuration?: unknown | null }>): boolean {
  const corporate = items.filter((item) => isCorporatePackageSku(skuFromConfiguration(item.configuration)));
  if (!corporate.length) return false;
  return corporate.every((item) => Boolean(organizationIdFromConfiguration(item.configuration)));
}

export function commerceOrderIsSeatPack(items: Array<{ configuration?: unknown | null }>): boolean {
  return items.some((item) => {
    const sku = skuFromConfiguration(item.configuration);
    if (isSeatPackSku(sku)) return true;
    const orgId = organizationIdFromConfiguration(item.configuration);
    const seats = seatCountFromConfiguration(item.configuration);
    return Boolean(orgId) && Boolean(seats) && !isCorporatePackageSku(sku);
  });
}

export type SeatPackFulfillmentState = "FULFILLED" | "FAILED" | "PENDING" | null;

export function deriveSeatPackFulfillmentState(
  seatPack: boolean,
  auditLogs?: Array<{ action?: string | null }> | null,
): SeatPackFulfillmentState {
  if (!seatPack) return null;
  const logs = auditLogs ?? [];
  for (const log of logs) {
    if (log?.action === "SEAT_PACK_FULFILLED") {
      return "FULFILLED";
    }
    if (log?.action === "SEAT_PACK_FULFILLMENT_FAILED") {
      return "FAILED";
    }
  }
  return "PENDING";
}

export async function loadCommerceOrderKind(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  orderId: string,
) {
  const [{ data: items }, { count }, { data: auditLogs }] = await Promise.all([
    admin.from("commerce_order_items").select("configuration").eq("order_id", orderId),
    admin
      .from("commerce_fulfillment_issues")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)
      .is("resolved_at", null),
    admin
      .from("admin_audit_log")
      .select("action,after_value,created_at")
      .in("action", ["SEAT_PACK_FULFILLED", "SEAT_PACK_FULFILLMENT_FAILED"])
      .eq("after_value->>order_id", orderId)
      .order("created_at", { ascending: false }),
  ]);

  const rows = items ?? [];
  const corporate = commerceOrderIsCorporate(rows);
  const seatPack = commerceOrderIsSeatPack(rows);
  const seatPackFulfillment = deriveSeatPackFulfillmentState(seatPack, auditLogs);
  return {
    corporate,
    corporateReady: corporate && commerceOrderCorporateReady(rows),
    seatPack,
    seatPackFulfillment,
    reviewRequired: (count ?? 0) > 0,
    openIssueCount: count ?? 0,
  };
}
