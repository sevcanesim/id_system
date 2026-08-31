"use client";

import { usePathname } from "next/navigation";
import { INDIVIDUAL_SIDEBAR_CONFIG } from "./ui/sidebar-config";
import { resolveSidebarItems, type SidebarAvailability, type SidebarSectionAvailabilityMap } from "./ui/sidebar-state";
import UnifiedSidebar from "./ui/UnifiedSidebar";
import SidebarAccountFooter from "./ui/SidebarAccountFooter";

export type IndividualSidebarProps = {
  id?: string;
  email?: string;
  hasCorporateSubscription?: boolean;
  onSignOut?: () => void;
  open?: boolean;
  onClose?: () => void;
  itemAvailability?: Partial<Record<string, SidebarAvailability>>;
  sectionAvailability?: SidebarSectionAvailabilityMap;
};

export default function IndividualSidebar({
  id,
  email = "",
  hasCorporateSubscription = false,
  onSignOut,
  open = false,
  onClose,
  itemAvailability,
  sectionAvailability,
}: IndividualSidebarProps) {
  const pathname = usePathname();
  const close = onClose ?? (() => {});
  const items = resolveSidebarItems(INDIVIDUAL_SIDEBAR_CONFIG, {
    scope: "individual",
    hasCorporateSubscription,
    itemAvailability,
    sectionAvailability,
  });
  const activeKey = items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.key;
  const accountMeta = email || "Bireysel Hesap";
  const initials = accountMeta.trim().charAt(0).toLocaleUpperCase("tr-TR") || "Y";

  return (
    <UnifiedSidebar
      id={id}
      ariaLabel="Bireysel hesap menüsü"
      subtitle="Bireysel Panel"
      brandHref="/kartlarim"
      items={items}
      activeKey={activeKey}
      open={open}
      onClose={close}
      className="id-sidebar--individual"
      sectionAvailability={sectionAvailability}
      footer={
        <SidebarAccountFooter
          accountName="Bireysel Hesap"
          accountMeta={accountMeta}
          initials={initials}
          onSignOut={onSignOut}
          onClose={close}
        />
      }
    />
  );
}
