"use client";

import type { MouseEvent, ReactNode } from "react";
import UnifiedSidebar from "./UnifiedSidebar";
import type { SidebarNavItem } from "./SidebarNav";
import type { SidebarSectionAvailabilityMap } from "./sidebar-state";

/**
 * Compatibility wrapper. New code should prefer UnifiedSidebar directly.
 * Keeping this wrapper avoids a broad route migration in one commit.
 */
export default function PanelSidebar({
  children,
  footer,
  ...props
}: {
  ariaLabel: string;
  subtitle: string;
  items: SidebarNavItem[];
  activeKey?: string;
  open?: boolean;
  onClose: () => void;
  onNavigate?: (item: SidebarNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
  brandHref?: string;
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
  sectionAvailability?: SidebarSectionAvailabilityMap;
}) {
  return <UnifiedSidebar {...props} footer={footer ?? children} />;
}
