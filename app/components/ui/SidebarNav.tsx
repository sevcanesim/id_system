"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "../../icons";
import { groupSidebarItems } from "./sidebar-config";

/** Tek sidebar navigasyon bileşeni. */
export type SidebarNavItem = {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  group?: string;
  hidden?: boolean;
  activeWhen?: string[];
  roles?: readonly string[];
};

export type SidebarNavClassNames = {
  nav: string;
  entry?: string;
  group: string;
  active: string;
};

function defaultOpenGroups(
  groups: { name: string; items: { key: string }[] }[],
  activeKey?: string,
): Record<string, boolean> {
  const open: Record<string, boolean> = {};
  const activeGroup = groups.find((group) => group.items.some((item) => item.key === activeKey))?.name;
  for (const group of groups) {
    if (!group.name) continue;
    open[group.name] = group.name === activeGroup;
  }
  if (!activeGroup) {
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
}: {
  items: SidebarNavItem[];
  activeKey?: string;
  classNames: SidebarNavClassNames;
  ariaLabel?: string;
  onNavigate?: (key: string) => void;
  groupStorageKey?: string;
  railCollapsed?: boolean;
  collapsibleGroups?: boolean;
}) {
  const navId = useId();
  const visibleItems = items.filter((item) => !item.hidden);
  const groups = groupSidebarItems(visibleItems);
  const groupSignature = visibleItems.map((item) => `${item.group ?? ""}:${item.key}`).join("|");
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
        const activeGroup = groups.find((group) => group.items.some((item) => item.key === activeKey))?.name;
        if (activeGroup) next[activeGroup] = true;
        return next;
      });
    } catch {
      // sessionStorage yoksa varsayılan açık grup korunur.
    }
    // Mount + storage key only; group identity is reconciled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsibleGroups, groupStorageKey]);

  useEffect(() => {
    if (!collapsibleGroups) return;
    setOpenGroups((current) => {
      const defaults = defaultOpenGroups(groups, activeKey);
      const next = { ...defaults, ...current };
      const activeGroup = groups.find((group) => group.items.some((item) => item.key === activeKey))?.name;
      if (activeGroup) next[activeGroup] = true;
      const unchanged = Object.keys(next).length === Object.keys(current).length
        && Object.keys(next).every((key) => next[key] === current[key]);
      return unchanged ? current : next;
    });
    // groups is derived from groupSignature; comparing by identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, collapsibleGroups, groupSignature]);

  useEffect(() => {
    if (!collapsibleGroups || !hydrated || !groupStorageKey) return;
    try {
      window.sessionStorage.setItem(groupStorageKey, JSON.stringify(openGroups));
    } catch {
      // Kalıcı grup tercihi başarısız olsa da navigasyon çalışmaya devam eder.
    }
  }, [collapsibleGroups, groupStorageKey, hydrated, openGroups]);

  function toggleGroup(name: string) {
    if (!collapsibleGroups) return;
    setOpenGroups((current) => ({ ...current, [name]: !current[name] }));
  }

  return (
    <nav
      className={classNames.nav}
      role="navigation"
      aria-label={ariaLabel}
      style={collapsibleGroups ? undefined : { alignContent: "start" }}
    >
      {groups.map((group, index) => {
        const named = Boolean(group.name);
        const isOpen = !named || !collapsibleGroups || railCollapsed || Boolean(openGroups[group.name]);
        const groupDomId = `${navId.replace(/:/g, "")}-group-${index}`;
        return (
          <div key={group.name || `ungrouped-${index}`} className="enterprise-nav-group">
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
                  <Icon name="chevronDown" />
                </button>
              ) : (
                <div className={`${classNames.group} enterprise-nav-group-label`}>
                  <span>{group.name}</span>
                </div>
              )
            ) : null}
            <div
              id={named ? groupDomId : undefined}
              hidden={named && !isOpen}
              className="enterprise-nav-group-items"
            >
              {group.items.map((item) => {
                const selected = item.key === activeKey;
                return (
                  <div
                    key={item.key}
                    className={[classNames.entry, selected ? classNames.active : ""].filter(Boolean).join(" ") || undefined}
                  >
                    <Link
                      href={item.href}
                      aria-current={selected ? "page" : undefined}
                      className={selected ? classNames.active : ""}
                      onClick={(event) => {
                        onNavigate?.(item.key);
                        if (event.detail > 0) event.currentTarget.blur();
                      }}
                    >
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
