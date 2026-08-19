"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Icon, type IconName } from "../../icons";

/**
 * Tek sidebar navigasyon bileşeni.
 *
 * Bireysel panel (AppShell) ve kurumsal panel (CorporatePanelClient) daha
 * önce birbirinden bağımsız, elle yazılmış iki ayrı <nav> bloğuna sahipti.
 * Bu bileşen ikisinin de ortak paylaştığı mantığı — gruplanmış bağlantı
 * listesi, aktif sekme vurgusu ve erişimi olmayan sekmelerin gizlenmesi —
 * tek bir yerde toplar. Her iki panel kendi CSS sınıf adlarını (görsel
 * kimliğini) parametre olarak verir; böylece mevcut stiller ve testler
 * değişmeden, kod tekrarı ortadan kalkar.
 */
export type SidebarNavItem = {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  group?: string;
  /** Kullanıcının bu sekmeye erişimi yoksa true — sekme listede gösterilmez. */
  hidden?: boolean;
  /** Alt rotalarda da aktif kalması gereken menüler için rota öneki. */
  activeWhen?: string[];
  /** UI görünürlüğü; gerçek güvenlik server authorization katmanındadır. */
  roles?: readonly string[];
};

export type SidebarNavClassNames = {
  nav: string;
  entry?: string;
  group: string;
  active: string;
};

export default function SidebarNav({
  items,
  activeKey,
  classNames,
  ariaLabel,
  onNavigate,
}: {
  items: SidebarNavItem[];
  activeKey?: string;
  classNames: SidebarNavClassNames;
  ariaLabel?: string;
  onNavigate?: (key: string) => void;
}) {
  const visibleItems = items.filter((item) => !item.hidden);
  let previousGroup: string | undefined;

  return (
    <nav className={classNames.nav} role="navigation" aria-label={ariaLabel}>
      {visibleItems.map((item) => {
        const showGroup = Boolean(item.group && item.group !== previousGroup);
        previousGroup = item.group;
        const selected = item.key === activeKey;
        return (
          <Fragment key={item.key}>
            {showGroup && <span className={classNames.group}>{item.group}</span>}
            <div className={classNames.entry}>
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={selected ? classNames.active : ""}
                onClick={() => onNavigate?.(item.key)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </div>
          </Fragment>
        );
      })}
    </nav>
  );
}
