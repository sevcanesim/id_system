import type { SidebarConfigItem } from "./sidebar-config";
import type { SidebarAvailability, SidebarScope, SidebarSectionAvailabilityMap } from "./sidebar.types";

export type { SidebarAvailability, SidebarScope, SidebarSectionAvailabilityMap } from "./sidebar.types";

export type SidebarStateContext = {
  scope: SidebarScope;
  role?: string | null;
  hasCorporateSubscription?: boolean;
  itemAvailability?: Partial<Record<string, SidebarAvailability>>;
  sectionAvailability?: SidebarSectionAvailabilityMap;
};

export type ResolvedSidebarItem<T extends SidebarConfigItem = SidebarConfigItem> = Omit<T, "availability"> & {
  availability: SidebarAvailability;
  disabledReason?: string;
};

function resolveConfiguredAvailability(item: SidebarConfigItem): SidebarAvailability {
  return item.availability ?? "visible";
}

export function resolveSidebarItemState<T extends SidebarConfigItem>(
  item: T,
  context: SidebarStateContext,
): ResolvedSidebarItem<T> {
  const override = context.itemAvailability?.[item.key];
  let availability = override ?? resolveConfiguredAvailability(item);
  const disabledReason = item.disabledReason;

  if (
    context.scope === "individual" &&
    item.key === "subscription" &&
    context.hasCorporateSubscription
  ) {
    availability = "hidden";
  }

  return {
    ...item,
    availability,
    disabledReason,
  };
}

export function resolveSidebarItems<T extends SidebarConfigItem>(
  items: readonly T[],
  context: SidebarStateContext,
): ResolvedSidebarItem<T>[] {
  return items.map((item) => resolveSidebarItemState(item, context));
}

export function resolveSidebarSectionState(
  sectionName: string,
  context: SidebarStateContext,
): SidebarAvailability {
  return context.sectionAvailability?.[sectionName] ?? "visible";
}
