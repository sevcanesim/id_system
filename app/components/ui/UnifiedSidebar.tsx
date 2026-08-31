"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Icon } from "../../icons";
import SidebarNav, { type SidebarNavItem } from "./SidebarNav";
import type { SidebarSectionAvailabilityMap } from "./sidebar-state";

export type UnifiedSidebarProps = {
  ariaLabel: string;
  subtitle: string;
  items: SidebarNavItem[];
  activeKey?: string;
  open?: boolean;
  onClose: () => void;
  onNavigate?: (item: SidebarNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
  brandHref?: string;
  onBrandNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onBrandClick?: () => void;
  className?: string;
  id?: string;
  labelledBy?: string;
  footer?: ReactNode;
  loading?: boolean;
  collapsible?: boolean;
  collapsibleGroups?: boolean;
  storageKey?: string;
  sectionAvailability?: SidebarSectionAvailabilityMap;
};

export default function UnifiedSidebar({
  ariaLabel,
  subtitle,
  items,
  activeKey,
  open = false,
  onClose,
  onNavigate,
  brandHref,
  onBrandNavigate,
  onBrandClick,
  className,
  id,
  labelledBy,
  footer,
  loading = false,
  collapsible = false,
  collapsibleGroups = false,
  storageKey,
  sectionAvailability,
}: UnifiedSidebarProps) {
  const generatedId = useId();
  const sidebarId = id || `sidebar-${generatedId.replace(/:/g, "")}`;
  const sidebarRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const collapseStorageKey = storageKey || `yenomi:sidebar:${subtitle.toLowerCase().replace(/\s+/g, "-")}:collapsed`;

  useEffect(() => {
    if (!collapsible) return;
    try {
      setCollapsed(window.localStorage.getItem(collapseStorageKey) === "1");
    } catch {
      // UI tercihi kalıcılaştırılamazsa açık durum korunur.
    }
  }, [collapseStorageKey, collapsible]);

  useEffect(() => {
    if (!collapsible) return;
    try {
      window.localStorage.setItem(collapseStorageKey, collapsed ? "1" : "0");
    } catch {
      // Navigasyon localStorage olmadan da çalışır.
    }
  }, [collapseStorageKey, collapsed, collapsible]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = sidebarRef.current;
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLElement>(
      'a[href]:not([aria-disabled="true"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || []).filter((element) => !element.hasAttribute("hidden"));

    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
    // onClose is read from the render that opened the drawer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const brand = <>
    <span className="id-sidebar__brand-mark" aria-hidden="true">
      <img src="/images/yenomilabs-mark-transparent.png" alt="" />
    </span>
    <span className="id-sidebar__brand-copy">
      <strong>Yenomi ID</strong>
      <small>{subtitle}</small>
    </span>
  </>;

  return <>
    {open ? (
      <button type="button" className="id-sidebar__backdrop" aria-label="Menüyü kapat" onClick={onClose} />
    ) : null}

    <aside
      ref={sidebarRef}
      id={sidebarId}
      className={`id-sidebar unified-sidebar ${className || ""} ${collapsed ? "is-collapsed" : ""} ${open ? "id-sidebar--mobile-open" : ""}`.trim().replace(/\s+/g, " ")}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      data-open={open || undefined}
      data-collapsed={collapsed || undefined}
    >
      <button type="button" className="id-sidebar__mobile-close" aria-label="Menüyü kapat" onClick={onClose}>
        <Icon name="close" />
      </button>

      <div className="id-sidebar__brand">
        {brandHref
          ? <Link
              href={brandHref}
              className="id-sidebar__brand-link"
              onClick={(event) => {
                onClose();
                onBrandNavigate?.(event);
              }}
            >{brand}</Link>
          : <button type="button" className="id-sidebar__brand-link unified-sidebar__brand-button" onClick={onBrandClick}>{brand}</button>}
      </div>

      {loading ? (
        <nav className="id-sidebar__nav id-sidebar__nav--loading" aria-label={ariaLabel} aria-busy="true">
          <p className="id-sidebar__loading-note">Menü yükleniyor.</p>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="id-sidebar__loading-row" aria-hidden="true"><i /><span /></div>
          ))}
        </nav>
      ) : (
        <SidebarNav
          ariaLabel={ariaLabel}
          activeKey={activeKey}
          classNames={{
            nav: "id-sidebar__nav",
            section: "id-sidebar__section",
            sectionItems: "id-sidebar__section-items",
            entry: "id-sidebar__entry",
            link: "id-sidebar__link",
            icon: "id-sidebar__icon",
            label: "id-sidebar__label",
            group: "id-sidebar__section-label",
            active: "id-sidebar__link--active",
          }}
          onNavigate={(item, event) => {
            onClose();
            onNavigate?.(item, event);
          }}
          items={items}
          railCollapsed={collapsed}
          collapsibleGroups={collapsibleGroups}
          groupStorageKey={collapsibleGroups ? `${collapseStorageKey}:groups` : undefined}
          sectionAvailability={sectionAvailability}
        />
      )}

      <div className="unified-sidebar__footer-region">
        {footer}
        {collapsible ? (
          <button
            type="button"
            className="enterprise-sidebar-collapse"
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            aria-expanded={!collapsed}
            title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
            <span>{collapsed ? "Genişlet" : "Daralt"}</span>
          </button>
        ) : null}
      </div>
    </aside>
  </>;
}
