"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Icon } from "../../icons";
import SidebarNav, { type SidebarNavItem } from "./SidebarNav";
import type { SidebarSectionStatusMap } from "./sidebar-config";

/** Bireysel ve kurumsal çalışma alanlarının ortak sidebar'ı. */
export default function PanelSidebar({
  ariaLabel,
  subtitle,
  items,
  activeKey,
  open = false,
  onClose,
  onNavigate,
  onNavigateItem,
  brandHref,
  onBrandClick,
  onBrandNavigate,
  className,
  id,
  labelledBy,
  children,
  loading = false,
  collapsible = true,
  collapsibleGroups = true,
  storageKey,
  sectionStatuses,
}: {
  ariaLabel: string;
  subtitle: string;
  items: SidebarNavItem[];
  activeKey?: string;
  open?: boolean;
  onClose: () => void;
  onNavigate?: (key: string) => void;
  onNavigateItem?: (item: SidebarNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
  brandHref?: string;
  onBrandClick?: () => void;
  onBrandNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  id?: string;
  labelledBy?: string;
  children?: ReactNode;
  loading?: boolean;
  collapsible?: boolean;
  collapsibleGroups?: boolean;
  storageKey?: string;
  sectionStatuses?: SidebarSectionStatusMap;
}) {
  const generatedId = useId();
  const sidebarId = id || `panel-sidebar-${generatedId.replace(/:/g, "")}`;
  const sidebarRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const collapseStorageKey = storageKey || `yenomi:panel-sidebar:${subtitle.toLowerCase().replace(/\s+/g, "-")}:collapsed`;

  useEffect(() => {
    if (!collapsible) return;
    try {
      setCollapsed(window.localStorage.getItem(collapseStorageKey) === "1");
    } catch {}
  }, [collapseStorageKey, collapsible]);

  useEffect(() => {
    if (!collapsible) return;
    try {
      window.localStorage.setItem(collapseStorageKey, collapsed ? "1" : "0");
    } catch {}
  }, [collapseStorageKey, collapsed, collapsible]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = sidebarRef.current;
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || []).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-disabled") !== "true");
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  const brand = <>
    <span className="enterprise-yenomi-mark" aria-hidden="true"><img src="/images/yenomilabs-mark-transparent.png" alt="" /></span>
    <span className="enterprise-yenomi-copy"><strong>Yenomi ID</strong><small>{subtitle}</small></span>
  </>;

  return <>
    {open && <button type="button" className="enterprise-mobile-drawer-backdrop canonical-sidebar-backdrop" aria-label="Menüyü kapat" onClick={onClose} />}
    <aside ref={sidebarRef} id={sidebarId} className={`enterprise-sidebar canonical-panel-sidebar ${collapsed ? "is-collapsed" : ""} ${className || ""} ${open ? "is-mobile-open" : ""}`.trim().replace(/\s+/g, " ")} aria-label={ariaLabel} aria-labelledby={labelledBy} data-open={open || undefined} data-collapsed={collapsed || undefined}>
      <button type="button" className="enterprise-sidebar-mobile-close" aria-label="Menüyü kapat" onClick={onClose}><Icon name="close" /></button>
      {brandHref
        ? <Link href={brandHref} className="enterprise-side-brand enterprise-yenomi-brand" onClick={(event) => { onBrandNavigate?.(event); if (!event.defaultPrevented) onClose(); }}>{brand}</Link>
        : <button type="button" className="enterprise-side-brand enterprise-brand-button enterprise-yenomi-brand" onClick={onBrandClick}>{brand}</button>}
      {loading ? (
        <nav className="enterprise-canonical-nav enterprise-canonical-nav--loading" aria-label={ariaLabel} aria-busy="true">
          <p className="enterprise-nav-loading-note">Menü yükleniyor…</p>
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="enterprise-nav-loading-row" aria-hidden="true"><i /><span /></span>
          ))}
        </nav>
      ) : (
        <SidebarNav
          ariaLabel={ariaLabel}
          activeKey={activeKey}
          classNames={{ nav: "enterprise-canonical-nav", entry: "enterprise-nav-entry", group: "enterprise-side-section-title", active: "active" }}
          onNavigate={(item, event) => {
            onNavigateItem?.(item, event);
            if (event.defaultPrevented) return;
            onNavigate?.(item.key);
            onClose();
          }}
          items={items}
          railCollapsed={collapsed}
          collapsibleGroups={collapsibleGroups}
          groupStorageKey={collapsibleGroups ? `${collapseStorageKey}:groups` : undefined}
          sectionStatuses={sectionStatuses}
        />
      )}
      {children ? <div className="enterprise-sidebar-footer">{children}</div> : null}
      {collapsible && <button
        type="button"
        className="enterprise-sidebar-collapse"
        aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        aria-expanded={!collapsed}
        title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        onClick={() => setCollapsed((value) => !value)}
      >
        <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
        <span>{collapsed ? "Genişlet" : "Daralt"}</span>
      </button>}
    </aside>
  </>;
}
