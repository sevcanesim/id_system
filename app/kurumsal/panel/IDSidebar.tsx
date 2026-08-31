"use client";

import { usePathname } from "next/navigation";
import PanelSidebar from "../../components/ui/PanelSidebar";
import SidebarFooterActions from "../../components/ui/SidebarFooterActions";
import type { SidebarNavItem } from "../../components/ui/SidebarNav";
import { corporatePanelNavItems, getCorporateSidebarActiveKey } from "./domain/navigation";
import { useUnsavedChanges } from "../../components/UnsavedChangesContext";

export type IDSidebarProps = {
  role?: string;
  ownCardHref?: string;
  subscription?: {
    name?: string | null;
    usedSeats?: number | null;
    seatLimit?: number | null;
  } | null;
  canManageLicenses?: boolean;
  onManageLicenses?: () => void;
  onSignOut?: () => void | Promise<void>;
  open?: boolean;
  onClose?: () => void;
  loading?: boolean;
  collapsible?: boolean;
  storageKey?: string;
};

export default function IDSidebar({
  role,
  ownCardHref,
  subscription,
  canManageLicenses = false,
  onManageLicenses,
  onSignOut,
  open = false,
  onClose,
  loading = false,
  collapsible = true,
  storageKey = "yenomi:id-sidebar:collapsed",
}: IDSidebarProps) {
  const pathname = usePathname();
  const { guardLinkClick } = useUnsavedChanges();
  const activeKey = getCorporateSidebarActiveKey(pathname);
  const items: SidebarNavItem[] = corporatePanelNavItems(role, ownCardHref);

  const rawPlanName = (subscription?.name || "Business").replace(/BUSİNESS/gi, "BUSINESS");
  const planDisplayName = subscription?.seatLimit ? `${rawPlanName} ${subscription.seatLimit}` : rawPlanName;
  const usedSeatsCount = typeof subscription?.usedSeats === "number" ? subscription.usedSeats : 0;
  const seatLimitCount = subscription?.seatLimit ?? null;
  const usagePercentage = seatLimitCount ? Math.min(100, Math.round((usedSeatsCount / seatLimitCount) * 100)) : 0;

  return (
    <PanelSidebar
      ariaLabel="Kurumsal yönetim menüsü"
      subtitle="Kurumsal Panel"
      brandHref="/kurumsal/panel"
      className="canonical-panel-sidebar--corporate"
      open={open}
      onClose={() => onClose?.()}
      activeKey={activeKey}
      loading={loading}
      collapsible={collapsible}
      collapsibleGroups
      storageKey={storageKey}
      items={items}
      onBrandNavigate={(event) => guardLinkClick(event, "/kurumsal/panel")}
      onNavigateItem={(item, event) => guardLinkClick(event, item.href)}
    >
      <div className="id-sidebar__footer">
        <div className="id-sidebar__plan">
          <div className="id-sidebar__plan-info">
            <small className="id-sidebar__plan-name">{planDisplayName}</small>
            <strong className="id-sidebar__plan-capacity">
              {seatLimitCount !== null ? `${usedSeatsCount} / ${seatLimitCount} Kart` : "Kurumsal Kart"}
            </strong>
          </div>
          {seatLimitCount ? (
            <div className="id-sidebar__plan-meter" aria-hidden="true">
              <span style={{ width: `${usagePercentage}%` }} />
            </div>
          ) : null}
          {canManageLicenses && activeKey !== "cards" && onManageLicenses ? (
            <button
              type="button"
              className="id-sidebar__plan-action"
              onClick={() => {
                onManageLicenses();
                onClose?.();
              }}
            >
              Yönet
            </button>
          ) : null}
        </div>

        <SidebarFooterActions
          onSignOut={onSignOut}
          onAfterAction={() => onClose?.()}
        />
      </div>
    </PanelSidebar>
  );
}
