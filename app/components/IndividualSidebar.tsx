"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../icons";
import { INDIVIDUAL_SIDEBAR_CONFIG, groupSidebarItems } from "./ui/sidebar-config";

export type IndividualSidebarProps = {
  email?: string;
  hasCorporateSubscription?: boolean;
  onSignOut?: () => void;
  open?: boolean;
  onClose?: () => void;
  collapsible?: boolean;
  storageKey?: string;
};

export default function IndividualSidebar({
  email = "",
  hasCorporateSubscription = false,
  onSignOut,
  open = false,
  onClose,
  collapsible = true,
  storageKey = "yenomi:individual-sidebar:collapsed",
}: IndividualSidebarProps) {
  const pathname = usePathname();
  const generatedId = useId();
  const sidebarId = `individual-sidebar-${generatedId.replace(/:/g, "")}`;
  const sidebarRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const items = INDIVIDUAL_SIDEBAR_CONFIG.filter(
    (item) => !(item.key === "subscription" && hasCorporateSubscription),
  );
  const itemGroups = groupSidebarItems(items);
  const activeKey = items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.key;

  useEffect(() => {
    if (!collapsible) return;
    try {
      setCollapsed(window.localStorage.getItem(storageKey) === "1");
    } catch {}
  }, [collapsible, storageKey]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    if (!collapsible) return;
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {}
  }

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
        className={`id-sidebar id-sidebar--individual ${collapsed ? "id-sidebar--collapsed" : ""} ${open ? "id-sidebar--mobile-open" : ""}`.trim()}
        aria-label="Bireysel hesap menüsü"
        data-collapsed={collapsed || undefined}
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
                      title={collapsed ? item.label : undefined}
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

        <div className="id-sidebar__footer">
          <div className="enterprise-side-links enterprise-side-management canonical-personal-support">
            <a href="mailto:hello@yenomilabs.com" onClick={onClose}>
              <Icon name="headset" />
              <span>Destek</span>
            </a>
            <a href="https://www.yenomilabs.com" target="_blank" rel="noopener noreferrer">
              <Icon name="external" />
              <span>Yenomilabs</span>
            </a>
          </div>
        </div>

        <div className="id-sidebar__account">
          <span className="id-sidebar__account-avatar" aria-hidden="true">{initial}</span>
          <span className="id-sidebar__account-copy">
            <strong>Bireysel Hesap</strong>
            <small>{accountLabel}</small>
          </span>
          {onSignOut ? (
            <button
              type="button"
              className="id-sidebar__header-logout"
              aria-label="Çıkış Yap"
              title="Çıkış Yap"
              onClick={() => {
                onSignOut();
                onClose?.();
              }}
            >
              <Icon name="logout" />
              <span>Çıkış</span>
            </button>
          ) : null}
        </div>

        {collapsible ? (
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
        ) : null}
      </aside>
    </>
  );
}
