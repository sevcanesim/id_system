"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { validateCardWorkspace, validatePortal, type PortalCheckResult } from "../../lib/auth/portal-guard";
import { INDIVIDUAL_SIDEBAR_CONFIG } from "../components/ui/sidebar-config";
import PanelSidebar from "../components/ui/PanelSidebar";
import type { SidebarNavItem } from "../components/ui/SidebarNav";
import { Icon } from "../icons";

type ShellAction = { href?: string; label: string; primary?: boolean; onClick?: () => void; disabled?: boolean };

export default function DashboardShell({
  title,
  description,
  eyebrow,
  children,
  actions = [],
  portal = "individual",
  activeKey,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ShellAction[];
  portal?: "individual" | "business";
  activeKey?: string;
}) {
  const pathname = usePathname();
  const menuButtonId = useId();
  const sidebarId = `${menuButtonId.replace(/:/g, "")}-sidebar`;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [portalState, setPortalState] = useState<"checking" | "allowed" | "denied">("checking");
  const [hasCorporateSubscription, setHasCorporateSubscription] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setPortalState("allowed");
      return;
    }

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        if (!cancelled) {
          setPortalState("denied");
          window.location.replace(`/giris?portal=${portal}&next=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      const portalCheck: PortalCheckResult = portal === "individual"
        ? await validateCardWorkspace(supabase, authData.user.id)
        : await validatePortal(supabase, authData.user.id, portal);

      if (cancelled) return;
      if (!portalCheck.ok) {
        setPortalState("denied");
        window.location.replace(portal === "individual" ? "/kurumsal/panel" : "/kartlarim");
        return;
      }

      setEmail(authData.user.email || "");
      setPortalState("allowed");

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      try {
        const organizationResponse = await fetch("/api/organizations/mine", {
          headers: { authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (!organizationResponse.ok) return;
        const organizationPayload = (await organizationResponse.json()) as { organizations?: unknown[] };
        if (!cancelled) setHasCorporateSubscription(Boolean(organizationPayload.organizations?.length));
      } catch {
        setHasCorporateSubscription(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, portal]);

  if (portalState !== "allowed") {
    return (
      <main className="yi-app yi-app--loading" aria-busy="true">
        <div className="yi-app__loading" role="status" aria-live="polite">
          <strong>{portalState === "checking" ? "Çalışma alanınız hazırlanıyor…" : "Yönlendiriliyorsunuz…"}</strong>
          <span>Hesap türünüz doğrulanıyor.</span>
        </div>
      </main>
    );
  }

  const calculatedActiveKey = activeKey ?? INDIVIDUAL_SIDEBAR_CONFIG.find(
    (sidebarItem) => pathname === sidebarItem.href || pathname.startsWith(`${sidebarItem.href}/`),
  )?.key;

  return (
    <main className={`yi-app yi-app--${portal} enterprise-dashboard-shell p7-shell`}>
      <button
        id={menuButtonId}
        className="p7-menu-button enterprise-sidebar-mobile-trigger"
        type="button"
        aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
        aria-controls={sidebarId}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((isOpen) => !isOpen)}
      >
        <span />
        <span />
        <span />
      </button>
      {mobileOpen && (
        <button
          className="p7-backdrop"
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <PanelSidebar
        ariaLabel="Kullanıcı paneli navigasyonu"
        id={sidebarId}
        labelledBy={menuButtonId}
        subtitle="Kimlik Stüdyosu"
        brandHref="/kartlarim"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activeKey={calculatedActiveKey}
        storageKey="yenomi:individual-sidebar:collapsed"
        items={INDIVIDUAL_SIDEBAR_CONFIG.map<SidebarNavItem>((sidebarItem) => ({
          ...sidebarItem,
          hidden: sidebarItem.key === "subscription" && hasCorporateSubscription,
        }))}
      >
        <div className="enterprise-side-links enterprise-side-management canonical-personal-support">
          <a href="mailto:hello@yenomilabs.com">
            <Icon name="headset" />
            <span>Destek</span>
          </a>
          <a href="https://www.yenomilabs.com" target="_blank" rel="noopener noreferrer">
            <Icon name="external" />
            <span>Yenomilabs</span>
          </a>
        </div>
      </PanelSidebar>

      <section className="yi-app__main p7-workspace">
        <header className="yi-app__top p7-topbar">
          <div className="yi-top-account">
            <span className="yi-top-account__label">HESAP</span>
            <span>{email}</span>
          </div>
          <div className="yi-top-actions p7-topbar-actions">
            <Link href="/destek">Yardım</Link>
            <Link href="/">Siteye dön</Link>
          </div>
        </header>
        <div className="yi-app__content p7-content">
          <div className="yi-page-head">
            <span>{eyebrow || "YENOMI ID"}</span>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
            {actions.length > 0 && (
              <div className="yi-actions">
                {actions.map((action, actionIndex) => action.href ? (
                  <Link key={`${action.href}-${actionIndex}`} className={`yi-btn ${action.primary ? "yi-btn--primary" : "yi-btn--secondary"}`} href={action.href}>
                    {action.label}
                  </Link>
                ) : (
                  <button key={`${action.label}-${actionIndex}`} type="button" className={`yi-btn ${action.primary ? "yi-btn--primary" : "yi-btn--secondary"}`} onClick={action.onClick} disabled={action.disabled}>
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
