import { getSupabaseAdminClient } from "../supabase/server-admin";
import { isCorporatePackageSku } from "./packages";

function skuFromConfiguration(configuration: unknown): string | null {
  if (!configuration || typeof configuration !== "object") return null;
  const sku = (configuration as { sku?: unknown }).sku;
  return typeof sku === "string" ? sku : null;
}

export function commerceOrderIsCorporate(items: Array<{ configuration?: unknown | null }>): boolean {
  return items.some((item) => isCorporatePackageSku(skuFromConfiguration(item.configuration)));
}

export async function loadCommerceOrderKind(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  orderId: string,
) {
  const [{ data: items }, { count }] = await Promise.all([
    admin.from("commerce_order_items").select("configuration").eq("order_id", orderId),
    admin
      .from("commerce_fulfillment_issues")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)
      .is("resolved_at", null),
  ]);

  return {
    corporate: commerceOrderIsCorporate(items ?? []),
    reviewRequired: (count ?? 0) > 0,
    openIssueCount: count ?? 0,
  };
}
