"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useId, useState } from "react";
import { Icon, type IconName } from "../../icons";
import { AdminPageHeader, Button, ButtonLink } from "./DesignSystem";
import PanelSidebar from "./PanelSidebar";
import type { SidebarNavItem } from "./SidebarNav";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";

export type AppShellNavKey = "home" | "card" | "edit" | "analytics" | "orders" | "subscription" | "settings";
export type AppShellAction = { href?: string; label: string; onClick?: () => void; primary?: boolean; disabled?: boolean };

type NavItem = { key: AppShellNavKey; href: string; label: string; icon: IconName; group?: string };

const individualNav: NavItem[] = [
  { key: "home", href: "/kartlarim", label: "Genel Bakış", icon: "analytics", group: "KİMLİK" },
  { key: "card", href: "/kartim", label: "Dijital Kart", icon: "id", group: "KİMLİK" },
  { key: "edit", href: "/olustur", label: "Kimlik Stüdyosu", icon: "pencil", group: "KİMLİK" },
  { key: "analytics", href: "/istatistikler", label: "İstatistikler", icon: "analytics", group: "İÇGÖRÜLER" },
  { key: "orders", href: "/siparislerim", label: "Siparişlerim", icon: "box", group: "HESAP" },
  { key: "subscription", href: "/yenile", label: "Hizmet", icon: "refresh" },
  { key: "settings", href: "/ayarlar", label: "Ayarlar", icon: "users" },
];

export default function AppShell({ title, description, eyebrow, actions = [], children, activeKey }: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: AppShellAction[];
  children: ReactNode;
  activeKey?: AppShellNavKey;
}) {
  const pathname = usePathname();
  const menuButtonId = useId();
  const sidebarId = `${menuButtonId.replace(/:/g, "")}-sidebar`;
  const [mobileOpen, setMobileOpen] = useState(false);
  // Kurumsal lisansla yönetilen bireysel hesaplarda yıllık yenileme kendi
  // hesabından değil şirketin lisansından yürütülür; bu durumda "Abonelik"
  // sekmesinin erişimi yoktur ve sidebar'da gizlenir.
  const [hasCorporateSubscription, setHasCorporateSubscription] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const response = await fetch("/api/organizations/mine", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { organizations?: unknown[] };
        if (!cancelled) setHasCorporateSubscription(Boolean(body.organizations?.length));
      } catch {
        // Sessizce yok say — erişim kontrolü başarısız olursa varsayılan
        // olarak sekme gösterilmeye devam eder.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return <main id="main-content" className="p7-shell" data-surface="dashboard" data-ui-context="dashboard">
    <button id={menuButtonId} className="p7-menu-button" type="button" aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"} aria-controls={sidebarId} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>
      <span /><span /><span />
    </button>
    {mobileOpen && <button className="p7-backdrop" type="button" aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} />}

    <PanelSidebar
      ariaLabel="Kullanıcı paneli navigasyonu"
      id={sidebarId}
      labelledBy={menuButtonId}
      subtitle="Kimlik Stüdyosu"
      brandHref="/kartlarim"
      open={mobileOpen}
      onClose={() => setMobileOpen(false)}
      activeKey={activeKey ?? individualNav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.key}
      storageKey="yenomi:individual-sidebar:collapsed"
      items={individualNav.map<SidebarNavItem>((item) => ({
          ...item,
          hidden: item.key === "subscription" && hasCorporateSubscription,
      }))}
    >
      <div className="enterprise-side-links enterprise-side-management canonical-personal-support">
        <a href="mailto:hello@yenomilabs.com"><Icon name="headset" /><span>Destek</span></a>
        <a href="https://www.yenomilabs.com" target="_blank" rel="noopener noreferrer"><Icon name="external" /><span>Yenomilabs</span></a>
      </div>
    </PanelSidebar>

    <section className="p7-workspace">
      <header className="p7-topbar">
        <div className="p7-breadcrumb"><Link href="/kartlarim">Kimlik</Link><span>/</span><strong>{title}</strong></div>
        <div className="p7-topbar-actions"><a href="mailto:hello@yenomilabs.com" aria-label="Destek ekibine e-posta gönder" title="Destek"><Icon name="headset" /></a><span className="p7-avatar" aria-label="Kullanıcı hesabı">YI</span></div>
      </header>
      <div className="p7-content">
        <AdminPageHeader eyebrow={eyebrow} title={title} description={description} actions={actions.length ? actions.map((action, index) => action.href
          ? <ButtonLink key={`${action.label}-${index}`} href={action.href} variant={action.primary ? "primary" : "secondary"}>{action.label}</ButtonLink>
          : <Button key={`${action.label}-${index}`} variant={action.primary ? "primary" : "secondary"} disabled={action.disabled} onClick={action.onClick}>{action.label}</Button>) : undefined} />
        {children}
      </div>
    </section>
  </main>;
}
