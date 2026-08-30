"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../../icons";
import { corporatePanelNavItems, getCorporateSidebarActiveKey, type CorporateNavItem } from "./domain/navigation";
import { groupSidebarItems } from "../../components/ui/sidebar-config";
import { ROLE_LABELS } from "../../../lib/organizations/role-matrix";
import { normalizeOrganizationRole } from "../../../lib/organizations/permissions";
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
  collapsible?: boolean;
  storageKey?: string;
};

export default function IDSidebar({
  role,
  ownCardHref,
  user,
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
  const generatedId = useId();
  const sidebarId = `id-sidebar-${generatedId.replace(/:/g, "")}`;
  const sidebarRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const { guardLinkClick } = useUnsavedChanges();
  const activeKey = getCorporateSidebarActiveKey(pathname);
  const items: CorporateNavItem[] = corporatePanelNavItems(role, ownCardHref);
  const itemGroups = groupSidebarItems(items);

  useEffect(() => {
    if (!collapsible) return;
    try {
      setCollapsed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // LocalStorage fallback for restricted environments
    }
  }, [collapsible, storageKey]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (collapsible) {
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // LocalStorage fallback
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const sidebar = sidebarRef.current;
    const focusable = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((element) => !element.hasAttribute("hidden"));

    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  const initials = (user?.full_name || user?.email || "Y")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const normalizedRole = normalizeOrganizationRole(user?.role || role);
  const displayRoleLabel = normalizedRole ? ROLE_LABELS[normalizedRole] : "Yönetici";

  const rawPlanName = (subscription?.name || "Business").replace(/BUSİNESS/gi, "BUSINESS");
  const planDisplayName = subscription?.seatLimit ? `${rawPlanName} ${subscription.seatLimit}` : rawPlanName;

  const usedSeatsCount = typeof subscription?.usedSeats === "number" ? subscription.usedSeats : 0;
  const seatLimitCount = subscription?.seatLimit ?? null;
  const usagePercentage = seatLimitCount ? Math.min(100, Math.round((usedSeatsCount / seatLimitCount) * 100)) : 0;

  return (
    <>
      {open && (
        <button
          type="button"
          className="id-sidebar__backdrop"
          aria-label="Menüyü kapat"
          onClick={onClose}
        />
      )}
      <aside
        ref={sidebarRef}
        id={sidebarId}
        className={`id-sidebar ${collapsed ? "id-sidebar--collapsed" : ""} ${open ? "id-sidebar--mobile-open" : ""}`.trim()}
        aria-label="Kurumsal yönetim menüsü"
        data-collapsed={collapsed || undefined}
        data-open={open || undefined}
      >
        <button
          type="button"
          className="id-sidebar__mobile-close"
          aria-label="Menüyü kapat"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>

        <div className="id-sidebar__brand">
          <Link
            href="/kurumsal/panel"
            className="id-sidebar__brand-link"
            onClick={(e) => {
              onClose?.();
              guardLinkClick(e, "/kurumsal/panel");
            }}
          >
            <span className="id-sidebar__brand-mark" aria-hidden="true">
              <img src="/images/yenomilabs-mark-transparent.png" alt="" />
            </span>
            <span className="id-sidebar__brand-copy">
              <strong>Yenomi ID</strong>
              <small>Kurumsal Panel</small>
            </span>
          </Link>
        </div>

        {loading ? (
          <nav className="id-sidebar__nav id-sidebar__nav--loading" aria-label="Kurumsal yönetim menüsü" aria-busy="true">
            <p className="id-sidebar__loading-note">Menü yükleniyor.</p>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="id-sidebar__loading-row" aria-hidden="true">
                <i />
                <span />
              </div>
            ))}
          </nav>
        ) : (
          <nav className="id-sidebar__nav" aria-label="Kurumsal yönetim menüsü">
            {itemGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="id-sidebar__section">
                {group.name ? (
                  <span className="id-sidebar__section-label">{group.name}</span>
                ) : null}
                <div className="id-sidebar__section-items">
                  {group.items.map((item) => {
                    const isActive = item.key === activeKey;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`id-sidebar__link ${isActive ? "id-sidebar__link--active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={(e) => {
                          onClose?.();
                          guardLinkClick(e, item.href);
                        }}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="id-sidebar__icon" aria-hidden="true">
                          <Icon name={item.icon} />
                        </span>
                        <span className="id-sidebar__label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        )}

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

          <div className="id-sidebar__user">
            <span className="id-sidebar__user-avatar">{initials}</span>
            <div className="id-sidebar__user-info">
              <strong className="id-sidebar__user-name">{user?.full_name || user?.email || "Yönetici"}</strong>
              <small className="id-sidebar__user-role">{displayRoleLabel}</small>
            </div>
            {onSignOut ? (
              <button
                type="button"
                className="id-sidebar__logout"
                aria-label="Çıkış Yap"
                title="Çıkış Yap"
                onClick={() => {
                  onSignOut();
                  onClose?.();
                }}
              >
                <Icon name="logout" />
              </button>
            ) : null}
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            className="id-sidebar__collapse"
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            aria-expanded={!collapsed}
            title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            onClick={toggleCollapse}
          >
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
            <span className="id-sidebar__collapse-label">{collapsed ? "Genişlet" : "Daralt"}</span>
          </button>
        )}
      </aside>
    </>
  );
}
