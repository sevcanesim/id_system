"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { validateCardWorkspace, validatePortal, type PortalCheckResult } from "../../lib/auth/portal-guard";
import { clearLegacyCart, setCartOwner } from "../../lib/cart";
import { writeSessionCookie } from "../components/AuthSessionBridge";
import PanelSidebar from "../components/ui/PanelSidebar";
import { INDIVIDUAL_SIDEBAR_CONFIG } from "../components/ui/sidebar-config";

type ShellAction = {
  href?: string;
  label: string;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

export default function DashboardShell({
  title,
  description,
  children,
  actions = [],
  portal = "individual",
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

      const result: PortalCheckResult = portal === "individual"
        ? await validateCardWorkspace(sb, data.user.id)
        : await validatePortal(sb, data.user.id, portal);

      if (cancelled) return;
      if (!result.ok) {
        setPortalState("denied");
        window.location.replace(portal === "individual" ? "/kurumsal/panel" : "/kartlarim");
        return;
      }

      setEmail(data.user.email || "");
      setPortalState("allowed");

      const sessionRes = await sb.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      if (!token) return;

      try {
        const orgRes = await fetch("/api/organizations/mine", {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!orgRes.ok || cancelled) return;
        const body = (await orgRes.json()) as { organizations?: unknown[] };
        setHasCorporateSubscription(Boolean(body.organizations?.length));
      } catch {
        // Organization lookup is advisory for navigation visibility only.
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
    setMobileOpen(false);
    router.replace(`/giris?portal=${portal}`);
    router.refresh();
  }

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

  const accountMeta = email || "Bireysel Hesap";
  const accountInitials = accountMeta.trim().charAt(0).toLocaleUpperCase("tr-TR") || "Y";

  return (
    <main className={`yi-app yi-app--${portal} enterprise-dashboard-shell p7-shell`}>
      <button
        id={menuButtonId}
        className="p7-menu-button enterprise-sidebar-mobile-trigger"
        type="button"
        aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
        aria-controls={sidebarId}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      <PanelSidebar
        id={sidebarId}
        scope="individual"
        ariaLabel="Bireysel hesap menüsü"
        subtitle="Bireysel Panel"
        brandHref="/kartlarim"
        items={INDIVIDUAL_SIDEBAR_CONFIG}
        hasCorporateSubscription={hasCorporateSubscription}
        account={{ name: "Bireysel Hesap", meta: accountMeta, initials: accountInitials }}
        onSignOut={signOut}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        className="id-sidebar--individual"
      />

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
                {actions.map((action, index) => action.href ? (
                  <Link
                    key={`${action.href}-${index}`}
                    className={`yi-btn ${action.primary ? "yi-btn--primary" : "yi-btn--secondary"}`}
                    href={action.href}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={`${action.label}-${index}`}
                    type="button"
                    className={`yi-btn ${action.primary ? "yi-btn--primary" : "yi-btn--secondary"}`}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
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
