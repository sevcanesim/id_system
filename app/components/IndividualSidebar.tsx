"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "../icons";
import { INDIVIDUAL_SIDEBAR_CONFIG, groupSidebarItems } from "./ui/sidebar-config";
import SidebarAccountFooter from "./ui/SidebarAccountFooter";

export type IndividualSidebarProps = {
  id?: string;
  email?: string;
  hasCorporateSubscription?: boolean;
  onSignOut?: () => void;
  open?: boolean;
  onClose?: () => void;
};

export default function IndividualSidebar({
  id,
  email = "",
  hasCorporateSubscription = false,
  onSignOut,
  open = false,
  onClose,
}: IndividualSidebarProps) {
  const pathname = usePathname();
  const sidebarId = id || "individual-sidebar";
  const sidebarRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const items = INDIVIDUAL_SIDEBAR_CONFIG.filter(
    (item) => !(item.key === "subscription" && hasCorporateSubscription),
  );
  const itemGroups = groupSidebarItems(items);
  const activeKey = items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.key;

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sidebar = sidebarRef.current;
    const focusable = () => Array.from(
      sidebar?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  const accountLabel = email || "Bireysel Hesap";
  const initial = accountLabel.trim().charAt(0).toLocaleUpperCase("tr-TR") || "Y";

  return (
    <>
      {open ? (
        <button type="button" className="id-sidebar__backdrop" aria-label="Menüyü kapat" onClick={onClose} />
      ) : null}

      <aside
        ref={sidebarRef}
        id={sidebarId}
        className={`id-sidebar id-sidebar--individual ${open ? "id-sidebar--mobile-open" : ""}`.trim()}
        aria-label="Bireysel hesap menüsü"
        data-open={open || undefined}
      >
        <button type="button" className="id-sidebar__mobile-close" aria-label="Menüyü kapat" onClick={onClose}>
          <Icon name="close" />
        </button>

        <div className="id-sidebar__brand">
          <Link href="/kartlarim" className="id-sidebar__brand-link" onClick={onClose}>
            <span className="id-sidebar__brand-mark" aria-hidden="true">
              <img src="/images/yenomilabs-mark-transparent.png" alt="" />
            </span>
            <span className="id-sidebar__brand-copy">
              <strong>Yenomi ID</strong>
              <small>Bireysel Panel</small>
            </span>
          </Link>
        </div>

        <nav className="id-sidebar__nav" aria-label="Bireysel hesap menüsü">
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
                      onClick={onClose}
                    >
                      <span className="id-sidebar__icon" aria-hidden="true"><Icon name={item.icon} /></span>
                      <span className="id-sidebar__label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <SidebarAccountFooter
          accountName="Bireysel Hesap"
          accountMeta={accountLabel}
          initials={initial}
          onSignOut={onSignOut}
          onClose={onClose}
        />
      </aside>
    </>
  );
}
