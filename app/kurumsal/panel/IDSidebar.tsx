"use client";

import { usePathname } from "next/navigation";
import { corporatePanelNavItems, getCorporateSidebarActiveKey } from "./domain/navigation";
import UnifiedSidebar from "../../components/ui/UnifiedSidebar";
import SidebarAccountFooter from "../../components/ui/SidebarAccountFooter";
import { resolveSidebarItems, type SidebarAvailability } from "../../components/ui/sidebar-state";
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
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Şirket Sahibi",
  ADMIN: "Yönetici",
  HR: "İnsan Kaynakları",
  HR_MANAGER: "İnsan Kaynakları",
  DEPARTMENT_MANAGER: "Departman Yöneticisi",
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
}: IDSidebarProps) {
  const pathname = usePathname();
  const close = onClose ?? (() => {});
  const { guardLinkClick } = useUnsavedChanges();
  const activeKey = getCorporateSidebarActiveKey(pathname);
  const items = resolveSidebarItems(corporatePanelNavItems(role, ownCardHref), {
    scope: "corporate",
    role,
    itemAvailability,
  });

  const accountName = user?.full_name?.trim() || "Kurumsal Hesap";
  const accountMeta = user?.email?.trim() || ROLE_LABELS[(user?.role || role || "EMPLOYEE").toUpperCase()] || "Kurumsal Kullanıcı";
  const initials = (accountName || accountMeta || "Y")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR") || "Y";

  return (
    <UnifiedSidebar
      ariaLabel="Kurumsal yönetim menüsü"
      subtitle="Kurumsal Panel"
      brandHref="/kurumsal/panel"
      items={items}
      activeKey={activeKey}
      open={open}
      onClose={close}
      loading={loading}
      className="id-sidebar--corporate"
      onNavigate={(item, event) => guardLinkClick(event, item.href)}
      footer={
        <SidebarAccountFooter
          accountName={accountName}
          accountMeta={accountMeta}
          initials={initials}
          onSignOut={onSignOut}
          onClose={close}
        />
      }
    />
  );
}
