"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { Icon } from "../../icons";
import { corporatePanelNavItems, getCorporateSidebarActiveKey, type CorporateNavItem } from "./domain/navigation";
import { groupSidebarItems } from "../../components/ui/sidebar-config";
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
}: IDSidebarProps) {
  const pathname = usePathname();
  const generatedId = useId();
  const sidebarId = `id-sidebar-${generatedId.replace(/:/g, "")}`;
  const sidebarRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const { guardLinkClick } = useUnsavedChanges();
  const activeKey = getCorporateSidebarActiveKey(pathname);
  const items: CorporateNavItem[] = corporatePanelNavItems(role, ownCardHref);
  const itemGroups = groupSidebarItems(items);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  const accountName = user?.full_name?.trim() || "Kurumsal Hesap";
  const accountEmail = user?.email?.trim() || "";
  const accountRole = ROLE_LABELS[(user?.role || role || "EMPLOYEE").toUpperCase()] || "Kurumsal Kullanıcı";
  const accountInitials = (accountName || accountEmail || "Y")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR") || "Y";

  return (
    <>
      {open ? (
        <button type="button" className="id-sidebar__backdrop" aria-label="Menüyü kapat" onClick={onClose} />
      ) : null}

      <aside
        ref={sidebarRef}
        id={sidebarId}
        className={`id-sidebar ${open ? "id-sidebar--mobile-open" : ""}`.trim()}
        aria-label="Kurumsal yönetim menüsü"
        data-open={open || undefined}
        style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}
      >
        <button type="button" className="id-sidebar__mobile-close" aria-label="Menüyü kapat" onClick={onClose}>
          <Icon name="close" />
        </button>

        <div className="id-sidebar__brand">
          <Link
            href="/kurumsal/panel"
            className="id-sidebar__brand-link"
            onClick={(event) => {
              onClose?.();
              guardLinkClick(event, "/kurumsal/panel");
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
          <nav
            className="id-sidebar__nav id-sidebar__nav--loading"
            aria-label="Kurumsal yönetim menüsü"
            aria-busy="true"
            style={{ paddingBottom: 220 }}
          >
            <p className="id-sidebar__loading-note">Menü yükleniyor.</p>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="id-sidebar__loading-row" aria-hidden="true">
                <i />
                <span />
              </div>
            ))}
          </nav>
        ) : (
          <nav
            className="id-sidebar__nav"
            aria-label="Kurumsal yönetim menüsü"
            style={{ paddingBottom: 220 }}
          >
            {itemGroups.map((group) => (
              <div key={group.name || group.items[0]?.key || "root"} className="id-sidebar__section">
                {group.name ? <span className="id-sidebar__section-label">{group.name}</span> : null}
                <div className="id-sidebar__section-items">
                  {group.items.map((item) => {
                    const isActive = item.key === activeKey;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`id-sidebar__link ${isActive ? "id-sidebar__link--active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={(event) => {
                          onClose?.();
                          guardLinkClick(event, item.href);
                        }}
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

        <div
          aria-label="Kurumsal hesap kısayolları"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            display: "flex",
            visibility: "visible",
            opacity: 1,
            flexDirection: "column",
            gap: 8,
            padding: "16px 18px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <a
            href="mailto:hello@yenomilabs.com"
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, color: "var(--ink-2)" }}
          >
            <Icon name="headset" />
            <span>Destek</span>
          </a>
          <a
            href="https://www.yenomilabs.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, color: "var(--ink-2)" }}
          >
            <Icon name="external" />
            <span>Yenomilabs</span>
          </a>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "44px minmax(0, 1fr) 40px",
              alignItems: "center",
              gap: 10,
              minHeight: 64,
              marginTop: 4,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                background: "var(--gold-dim)",
                color: "var(--gold-hi)",
                fontWeight: 700,
              }}
            >
              {accountInitials}
            </span>
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>
                {accountName}
              </strong>
              <small style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink-3)" }}>
                {accountEmail || accountRole}
              </small>
            </span>
            {onSignOut ? (
              <button
                type="button"
                aria-label="Çıkış Yap"
                title="Çıkış Yap"
                onClick={() => {
                  onSignOut();
                  onClose?.();
                }}
                style={{
                  width: 40,
                  height: 40,
                  display: "grid",
                  placeItems: "center",
                  border: 0,
                  background: "transparent",
                  color: "var(--ink-2)",
                }}
              >
                <Icon name="logout" />
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
