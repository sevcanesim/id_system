import type { getSupabaseAdminClient } from "../supabase/server-admin";

export type OrganizationCapacityTerm = {
  id: string;
  organization_id: string;
  source_order_id: string | null;
  renewed_from_id: string | null;
  card_count: number;
  starts_at: string;
  expires_at: string;
  renewal_price_kurus: number | null;
  currency: "TRY";
  status: "ACTIVE" | "GRACE_PERIOD" | "EXPIRED" | "CANCELLED";
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

export async function getOrganizationCapacityTerms(
  admin: SupabaseAdminClient,
  organizationIds: string[],
) {
  if (!organizationIds.length) {
    return { data: [] as OrganizationCapacityTerm[], error: null };
  }

  const { data, error } = await admin
    .from("organization_capacity_terms")
    .select(
      "id,organization_id,source_order_id,renewed_from_id,card_count,starts_at,expires_at,renewal_price_kurus,currency,status",
    )
    .in("organization_id", organizationIds)
    .in("status", ["ACTIVE", "GRACE_PERIOD"])
    .order("expires_at", { ascending: true });

  return {
    data: (data ?? []) as OrganizationCapacityTerm[],
    error,
  };
}
