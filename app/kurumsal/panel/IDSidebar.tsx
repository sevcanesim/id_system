"use client";

import { usePathname } from "next/navigation";
import PanelSidebar from "../../components/ui/PanelSidebar";
import { corporatePanelNavItems, getCorporateSidebarActiveKey } from "./domain/navigation";
import type { SidebarAvailability, SidebarSectionAvailabilityMap } from "../../components/ui/sidebar-state";
import { useUnsavedChanges } from "../../components/UnsavedChangesContext";

export type IDSidebarProps = {
  role?: string;
  ownCardHref?: string;
  user?: {
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  subscription?: {
    name?: string | null;
    usedSeats?: number | null;
    seatLimit?: number | null;
  } | null;
  canManageLicenses?: boolean;
  onManageLicenses?: () => void;
  onSignOut?: () => void;
  open?: boolean;
  onClose?: () => void;
  loading?: boolean;
  itemAvailability?: Partial<Record<string, SidebarAvailability>>;
  sectionAvailability?: SidebarSectionAvailabilityMap;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Şirket Sahibi",
  ADMIN: "Yönetici",
  HR: "İnsan Kaynakları",
  HR_MANAGER: "İnsan Kaynakları",
  EMPLOYEE: "Çalışan",
};

export default function IDSidebar({
  role,
  ownCardHref,
  user,
  onSignOut,
  open = false,
  onClose,
  loading = false,
  itemAvailability,
  sectionAvailability,
}: IDSidebarProps) {
  const pathname = usePathname();
  const close = onClose ?? (() => {});
  const { guardLinkClick } = useUnsavedChanges();
  const accountName = user?.full_name?.trim() || "Kurumsal Hesap";
  const accountMeta = user?.email?.trim()
    || ROLE_LABELS[(user?.role || role || "EMPLOYEE").toUpperCase()]
    || "Kurumsal Kullanıcı";
  const initials = (accountName || accountMeta || "Y")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR") || "Y";

  return (
    <PanelSidebar
      scope="corporate"
      ariaLabel="Kurumsal yönetim menüsü"
      subtitle="Kurumsal Panel"
      brandHref="/kurumsal/panel"
      onBrandNavigate={(event) => guardLinkClick(event, "/kurumsal/panel")}
      items={corporatePanelNavItems(role, ownCardHref)}
      activeKey={getCorporateSidebarActiveKey(pathname)}
      role={role}
      open={open}
      onClose={close}
      loading={loading}
      className="id-sidebar--corporate"
      itemAvailability={itemAvailability}
      sectionAvailability={sectionAvailability}
      account={{ name: accountName, meta: accountMeta, initials }}
      onSignOut={onSignOut}
      onNavigate={(item, event) => guardLinkClick(event, item.href)}
    />
  );
}
