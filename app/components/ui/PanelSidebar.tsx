"use client";

import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import UnifiedSidebar from "./UnifiedSidebar";
import SidebarAccountFooter from "./SidebarAccountFooter";
import type { SidebarNavItem } from "./SidebarNav";
import { resolveSidebarItems } from "./sidebar-state";
import type { SidebarAvailability, SidebarSectionAvailabilityMap, SidebarScope } from "./sidebar.types";
import type { SidebarConfigItem } from "./sidebar-config";

export type PanelSidebarAccount = {
  name: string;
  meta: string;
  initials: string;
};

export type PanelSidebarProps = {
  scope?: SidebarScope;
  ariaLabel: string;
  subtitle: string;
  items: readonly SidebarConfigItem[];
  activeKey?: string;
  role?: string | null;
  hasCorporateSubscription?: boolean;
  itemAvailability?: Partial<Record<string, SidebarAvailability>>;
  sectionAvailability?: SidebarSectionAvailabilityMap;
  account?: PanelSidebarAccount;
  onSignOut?: () => void;
  open?: boolean;
  onClose: () => void;
  onNavigate?: (item: SidebarNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
  brandHref?: string;
  onBrandNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onBrandClick?: () => void;
  className?: string;
  id?: string;
  labelledBy?: string;
  children?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  collapsible?: boolean;
  collapsibleGroups?: boolean;
  storageKey?: string;
};

export default function PanelSidebar({
  scope = "individual",
  items,
  activeKey,
  role,
  hasCorporateSubscription,
  itemAvailability,
  sectionAvailability,
  account,
  onSignOut,
  onClose,
  children,
  footer,
  ...props
}: PanelSidebarProps) {
  const pathname = usePathname();
  const resolvedItems = resolveSidebarItems(items, {
    scope,
    role,
    hasCorporateSubscription,
    itemAvailability,
    sectionAvailability,
  });
  const resolvedActiveKey = activeKey ?? resolvedItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.key;

  const accountFooter = account ? (
    <SidebarAccountFooter
      accountName={account.name}
      accountMeta={account.meta}
      initials={account.initials}
      onSignOut={onSignOut}
      onClose={onClose}
    />
  ) : null;

  return (
    <UnifiedSidebar
      {...props}
      items={resolvedItems}
      activeKey={resolvedActiveKey}
      onClose={onClose}
      sectionAvailability={sectionAvailability}
      footer={footer ?? children ?? accountFooter}
    />
  );
}
