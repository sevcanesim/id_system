export function unusedEntitlementId(
  entitlements: Array<{ id: string }>,
  profiles: Array<{ entitlement_id?: string | null }>,
): string | null {
  const used = new Set(
    profiles
      .map((profile) => profile.entitlement_id)
      .filter((id): id is string => Boolean(id)),
  );
  return entitlements.find((item) => !used.has(item.id))?.id ?? null;
}
