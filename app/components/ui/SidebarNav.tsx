"use client";

import { useEffect, useId, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Icon, type IconName } from "../../icons";
import { groupSidebarItems } from "./sidebar-config";
import type { SidebarAvailability, SidebarSectionAvailabilityMap } from "./sidebar.types";

export type SidebarNavItem = {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  group?: string;
  availability?: SidebarAvailability;
  disabledReason?: string;
  activeWhen?: string[];
  roles?: readonly string[];
};

export type SidebarNavClassNames = {
  nav: string;
  section?: string;
  sectionItems?: string;
  link?: string;
  icon?: string;
  label?: string;
  group: string;
  active: string;
};

function defaultOpenGroups(
  groups: { name: string; items: { key: string }[] }[],
  activeKey?: string,
): Record<string, boolean> {
  const open: Record<string, boolean> = {};
  const currentGroup = groups.find((group) => group.items.some((item) => item.key === activeKey))?.name;
  for (const group of groups) {
    if (!group.name) continue;
    open[group.name] = group.name === currentGroup;
  }
  if (!currentGroup) {
    const firstNamed = groups.find((group) => group.name)?.name;
    if (firstNamed) open[firstNamed] = true;
  }
  return open;
}

export default function SidebarNav({
  items,
  activeKey,
  classNames,
  ariaLabel,
  onNavigate,
  groupStorageKey,
  railCollapsed = false,
  collapsibleGroups = true,
  sectionAvailability = {},
}: {
  items: SidebarNavItem[];
  activeKey?: string;
  classNames: SidebarNavClassNames;
  ariaLabel?: string;
  onNavigate?: (item: SidebarNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
  groupStorageKey?: string;
  railCollapsed?: boolean;
  collapsibleGroups?: boolean;
  sectionAvailability?: SidebarSectionAvailabilityMap;
}) {
  const navId = useId();
  const visibleItems = items.filter((item) => (item.availability ?? "visible") !== "hidden");
  const groups = groupSidebarItems(visibleItems).filter(
    (group) => (sectionAvailability[group.name] ?? "visible") !== "hidden",
  );
  const groupSignature = groups
    .flatMap((group) => group.items.map((item) => `${group.name}:${item.key}:${item.availability ?? "visible"}`))
    .join("|");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => defaultOpenGroups(groups, activeKey));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!collapsibleGroups || !groupStorageKey) return;
    try {
      const raw = window.sessionStorage.getItem(groupStorageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as Record<string, boolean>;
      setOpenGroups((current) => {
        const next = { ...current, ...stored };
        const currentGroup = groups.find((group) => group.items.some((item) => item.key === activeKey))?.name;
        if (currentGroup) next[currentGroup] = true;
        return next;
      });
    } catch {
      // sessionStorage yoksa varsayılan açık grup korunur.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsibleGroups, groupStorageKey]);

  useEffect(() => {
    if (!collapsibleGroups) return;
    setOpenGroups((current) => {
      const defaults = defaultOpenGroups(groups, activeKey);
      const next = { ...defaults, ...current };
      const currentGroup = groups.find((group) => group.items.some((item) => item.key === activeKey))?.name;
      if (currentGroup) next[currentGroup] = true;
      const unchanged = Object.keys(next).length === Object.keys(current).length
        && Object.keys(next).every((key) => next[key] === current[key]);
      return unchanged ? current : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, collapsibleGroups, groupSignature]);

  useEffect(() => {
    if (!collapsibleGroups || !hydrated || !groupStorageKey) return;
    try {
      window.sessionStorage.setItem(groupStorageKey, JSON.stringify(openGroups));
    } catch {
      // Grup tercihi kalıcılaştırılamazsa navigasyon yine çalışır.
    }
  }, [collapsibleGroups, groupStorageKey, hydrated, openGroups]);

  function toggleGroup(name: string) {
    if (!collapsibleGroups) return;
    setOpenGroups((current) => ({ ...current, [name]: !current[name] }));
  }

  return (
    <nav className={classNames.nav} aria-label={ariaLabel} data-static-groups={!collapsibleGroups || undefined}>
      {groups.map((group, index) => {
        const named = Boolean(group.name);
        const sectionState = sectionAvailability[group.name] ?? "visible";
        const sectionDisabled = sectionState === "disabled";
        const isOpen = !named || !collapsibleGroups || railCollapsed || Boolean(openGroups[group.name]);
        const groupDomId = `${navId.replace(/:/g, "")}-group-${index}`;
        return (
          <div
            key={group.name || `ungrouped-${index}`}
            className={["enterprise-nav-group", classNames.section].filter(Boolean).join(" ")}
            data-availability={sectionState}
            aria-disabled={sectionDisabled || undefined}
          >
            {named ? (
              collapsibleGroups ? (
                <button
                  type="button"
                  className={`${classNames.group} enterprise-nav-group-toggle`}
                  aria-expanded={isOpen}
                  aria-controls={groupDomId}
                  onClick={() => toggleGroup(group.name)}
                >
                  <span>{group.name}</span>
                  {sectionState !== "visible" ? <small className="enterprise-nav-group-status">Pasif</small> : null}
                  <Icon name="chevronDown" />
                </button>
              ) : (
                <span className={classNames.group}>
                  {group.name}
                  {sectionState !== "visible" ? <small className="enterprise-nav-group-status">Pasif</small> : null}
                </span>
              )
            ) : null}
            <div
              id={named ? groupDomId : undefined}
              hidden={named && !isOpen}
              className={["enterprise-nav-group-items", classNames.sectionItems].filter(Boolean).join(" ")}
            >
              {group.items.map((item) => {
                const itemAvailability = item.availability ?? "visible";
                const disabled = sectionDisabled || itemAvailability === "disabled";
                const isCurrent = !disabled && item.key === activeKey;
                const disabledReason = sectionDisabled ? "Bu bölüm şu anda kullanılamıyor." : item.disabledReason;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={isCurrent ? "page" : undefined}
                    aria-disabled={disabled || undefined}
                    tabIndex={disabled ? -1 : undefined}
                    title={disabled ? disabledReason : undefined}
                    data-availability={disabled ? "disabled" : itemAvailability}
                    className={[
                      classNames.link,
                      isCurrent ? classNames.active : "",
                      disabled ? "is-disabled" : "",
                    ].filter(Boolean).join(" ") || undefined}
                    onClick={(event) => {
                      if (disabled) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      onNavigate?.(item, event);
                      if (!event.defaultPrevented && event.detail > 0) event.currentTarget.blur();
                    }}
                  >
                    <span className={classNames.icon} aria-hidden="true"><Icon name={item.icon} /></span>
                    <span className={classNames.label}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
