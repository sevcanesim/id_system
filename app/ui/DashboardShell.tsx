"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { validateCardWorkspace, validatePortal, type PortalCheckResult } from "../../lib/auth/portal-guard";
import { clearLegacyCart, setCartOwner } from "../../lib/cart";
import { writeSessionCookie } from "../components/AuthSessionBridge";
import { INDIVIDUAL_SIDEBAR_CONFIG } from "../components/ui/sidebar-config";
import PanelSidebar from "../components/ui/PanelSidebar";
import SidebarFooterActions from "../components/ui/SidebarFooterActions";
import type { SidebarNavItem } from "../components/ui/SidebarNav";

type ShellAction = { href?: string; label: string; primary?: boolean; onClick?: () => void; disabled?: boolean };

export default function DashboardShell({
  title,
  description,
  children,
  actions = [],
  portal = "individual",
  activeKey,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ShellAction[];
  portal?: "individual" | "business";
  activeKey?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const menuButtonId = useId();
  const sidebarId = `${menuButtonId.replace(/:/g, "")}-sidebar`;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [portalState, setPortalState] = useState<"checking" | "allowed" | "denied">("checking");
  const [hasCorporateSubscription, setHasCorporateSubscription] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setPortalState("allowed");
      return;
    }
    void (async () => {
      const { data } = await sb.auth.getUser();
      if (!data.user) {
        if (!cancelled) {
          setPortalState("denied");
          window.location.replace(`/giris?portal=${portal}&next=${encodeURIComponent(pathname)}`);
        }
        return;
      }
      const result: PortalCheckResult =
        portal === "individual"
          ? await validateCardWorkspace(sb, data.user.id)
          : await validatePortal(sb, data.user.id, portal);
      if (cancelled) return;
      if (result.ok) {
        setEmail(data.user.email || "");
        setPortalState("allowed");

        const sessionRes = await sb.auth.getSession();
        const token = sessionRes.data.session?.access_token;
        if (token) {
          try {
            const orgRes = await fetch("/api/organizations/mine", {
              headers: { authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            if (orgRes.ok) {
              const body = (await orgRes.json()) as { organizations?: unknown[] };
              if (!cancelled) setHasCorporateSubscription(Boolean(body.organizations?.length));
            }
          } catch {
            // Sessizce yok say
          }
        }
      } else {
        setPortalState("denied");
        window.location.replace(portal === "individual" ? "/kurumsal/panel" : "/kartlarim");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, portal]);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    await writeSessionCookie(null);
    clearLegacyCart();
    setCartOwner(null, { claimGuest: false });
    router.replace(`/giris?portal=${portal}`);
    router.refresh();
  }

  if (portalState !== "allowed")
    return (
      <main className="yi-app yi-app--loading" aria-busy="true">
        <div className="yi-app__loading" role="status" aria-live="polite">
          <strong>{portalState === "checking" ? "Çalışma alanınız hazırlanıyor…" : "Yönlendiriliyorsunuz…"}</strong>
          <span>Hesap türünüz doğrulanıyor.</span>
        </div>
      </main>
    );

  const calculatedActiveKey =
    activeKey ??
    INDIVIDUAL_SIDEBAR_CONFIG.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.key;

  const sidebarItems = INDIVIDUAL_SIDEBAR_CONFIG.map<SidebarNavItem>((item) => ({
    ...item,
    status: item.key === "subscription" && hasCorporateSubscription ? "hidden" : "enabled",
  }));

  return (
    <main className={`yi-app yi-app--${portal} enterprise-dashboard-shell p7-shell`}>
      <button
        id={menuButtonId}
        className="p7-menu-button enterprise-sidebar-mobile-trigger"
        type="button"
        aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
        aria-controls={sidebarId}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((val) => !val)}
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
        subtitle="Bireysel Panel"
        brandHref="/kartlarim"
        className={portal === "individual" ? "canonical-panel-sidebar--individual" : undefined}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activeKey={calculatedActiveKey}
        collapsibleGroups
        storageKey="yenomi:individual-sidebar:collapsed"
        items={sidebarItems}
      >
        <SidebarFooterActions
          onSignOut={signOut}
          onAfterAction={() => setMobileOpen(false)}
        />
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
            <span>YENOMI ID</span>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
            {actions.length > 0 && (
              <div className="yi-actions">
                {actions.map((a, i) =>
                  a.href ? (
                    <Link
                      key={`${a.href}-${i}`}
                      className={`yi-btn ${a.primary ? "yi-btn--primary" : "yi-btn--secondary"}`}
                      href={a.href}
                    >
                      {a.label}
                    </Link>
                  ) : (
                    <button
                      key={`${a.label}-${i}`}
                      type="button"
                      className={`yi-btn ${a.primary ? "yi-btn--primary" : "yi-btn--secondary"}`}
                      onClick={a.onClick}
                      disabled={a.disabled}
                    >
                      {a.label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
