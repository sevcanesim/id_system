"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { validateCardWorkspace, validatePortal, type PortalCheckResult } from "../../lib/auth/portal-guard";
import { clearLegacyCart, setCartOwner } from "../../lib/cart";
import { writeSessionCookie } from "../components/AuthSessionBridge";
import PanelSidebar from "../components/ui/PanelSidebar";
import { LoadingState } from "../components/ui/States";
import { INDIVIDUAL_SIDEBAR_CONFIG } from "../components/ui/sidebar-config";
import styles from "./DashboardShell.module.css";

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
  eyebrow = "YENOMI ID",
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
      <main className={`yi-app ${styles.shell}`} aria-busy="true">
        <PanelSidebar
          id={sidebarId}
          scope="individual"
          ariaLabel="Bireysel hesap menüsü"
          subtitle="Bireysel Panel"
          brandHref="/kartlarim"
          items={INDIVIDUAL_SIDEBAR_CONFIG}
          activeKey={activeKey}
          onClose={() => setMobileOpen(false)}
          open={mobileOpen}
          className="id-sidebar--individual"
          loading
        />

        <section className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.account}>
              <span className={styles.accountLabel}>HESAP</span>
              <span>{portalState === "checking" ? "Yükleniyor" : "Yönlendiriliyor"}</span>
            </div>
          </header>

          <div className={styles.content}>
            <div className={styles.pageHead}>
              <span>{eyebrow}</span>
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            <LoadingState
              variant="panel"
              label={portalState === "checking" ? "Bilgiler yükleniyor" : "Yönlendiriliyor"}
              hint={portalState === "checking" ? "Güncel hesap bilgileriniz getiriliyor." : "Uygun çalışma alanına geçiliyor."}
            />
          </div>
        </section>
      </main>
    );
  }

  const accountMeta = email || "Bireysel Hesap";
  const accountInitials = accountMeta.trim().charAt(0).toLocaleUpperCase("tr-TR") || "Y";

  return (
    <main className={`yi-app ${styles.shell}`}>
      <button
        id={menuButtonId}
        className={`${styles.menu} enterprise-sidebar-mobile-trigger`}
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
        activeKey={activeKey}
        hasCorporateSubscription={hasCorporateSubscription}
        account={{ name: "Bireysel Hesap", meta: accountMeta, initials: accountInitials }}
        onSignOut={signOut}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        className="id-sidebar--individual"
      />

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.account}>
            <span className={styles.accountLabel}>HESAP</span>
            <span className={styles.accountValue}>{email}</span>
          </div>
          <div className={styles.topActions}>
            <Link href="/destek">Yardım</Link>
            <Link href="/">Siteye dön</Link>
          </div>
        </header>
        <div className={styles.content}>
          <div className={styles.pageHead}>
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
            {actions.length > 0 && (
              <div className={styles.actions}>
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
