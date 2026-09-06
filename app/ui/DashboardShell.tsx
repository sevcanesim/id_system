"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { clearBrowserAuthSession } from "../../lib/supabase/browser";
import { canUseCardWorkspace, isPortalAllowed, type AccountType, type TestLoginScope } from "../../lib/auth/account-type";
import { getBrowserIdentity } from "../../lib/auth/browser-identity";
import { clearLegacyCart, setCartOwner } from "../../lib/cart";
import { clearSensitiveBrowserState } from "../../lib/security/client-private-state";
import { INDIVIDUAL_PRODUCT_PURCHASE_HREF, needsIndividualProductPurchase } from "../../lib/commerce/individual-portal-access";
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
  const [portalState, setPortalState] = useState<"checking" | "allowed" | "purchase-required" | "denied">("checking");
  const [hasCorporateSubscription, setHasCorporateSubscription] = useState(false);
  const requiresProductAccess = portal === "individual" && activeKey !== "account";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const identity = await getBrowserIdentity();
      if (!identity) {
        if (!cancelled) {
          setPortalState("denied");
          window.location.replace(`/giris?portal=${portal}&next=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      const accountType = identity.account.type as AccountType | null;
      const testLoginScope = identity.account.testLoginScope as TestLoginScope | null;
      const allowed = accountType && (portal === "individual"
        ? canUseCardWorkspace(accountType, testLoginScope)
        : isPortalAllowed(accountType, "business", testLoginScope));

      if (cancelled) return;
      if (!allowed) {
        setPortalState("denied");
        window.location.replace(portal === "individual" ? "/kurumsal/panel" : "/kartim");
        return;
      }

      try {
        const [orgRes, entitlementRes] = await Promise.all([
          fetch("/api/organizations/mine", {
            credentials: "same-origin",
            cache: "no-store",
          }),
          requiresProductAccess
            ? fetch("/api/commerce/entitlements", {
              credentials: "same-origin",
              cache: "no-store",
            })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const organizationPayload = orgRes.ok
          ? await orgRes.json() as { organizations?: unknown[] }
          : { organizations: [] };
        const hasCorporateMembership = Boolean(organizationPayload.organizations?.length);
        setHasCorporateSubscription(hasCorporateMembership);

        const entitlementPayload = entitlementRes?.ok
          ? await entitlementRes.json() as {
            active?: boolean;
            renewalEntitlements?: unknown[];
            pendingEntitlements?: unknown[];
          }
          : null;
        if (needsIndividualProductPurchase({
          requiresProductAccess,
          entitlementLookupSucceeded: Boolean(entitlementPayload),
          corporateMembershipLookupSucceeded: orgRes.ok,
          hasActiveEntitlement: Boolean(entitlementPayload?.active),
          hasRenewalEntitlement: Boolean(entitlementPayload?.renewalEntitlements?.length),
          hasPendingEntitlement: Boolean(entitlementPayload?.pendingEntitlements?.length),
          hasCorporateMembership,
        })) {
          setEmail(identity.user.email || "");
          setPortalState("purchase-required");
          return;
        }
      } catch {
        // Access is never removed just because advisory product data is unavailable.
      }

      if (cancelled) return;
      setEmail(identity.user.email || "");
      setPortalState("allowed");
    })();

    return () => {
      cancelled = true;
    };
  }, [activeKey, pathname, portal, requiresProductAccess]);

  async function signOut() {
    await clearBrowserAuthSession();
    await writeSessionCookie(null);
    clearSensitiveBrowserState();
    clearLegacyCart();
    setCartOwner(null, { claimGuest: false });
    setMobileOpen(false);
    router.replace(`/giris?portal=${portal}`);
    router.refresh();
  }

  if (portalState === "checking" || portalState === "denied") {
    return (
      <main className={`yi-app ${styles.shell}`} aria-busy="true">
        <PanelSidebar
          id={sidebarId}
          scope="individual"
          ariaLabel="Bireysel hesap menüsü"
          subtitle="Bireysel Panel"
          brandHref="/kartim"
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
        brandHref="/kartim"
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
          {portalState === "purchase-required" ? (
            <section className={styles.purchaseGate} aria-labelledby="purchase-gate-title">
              <span className={styles.purchaseGateEyebrow}>YENOMI ID BAŞLANGIÇ</span>
              <h2 id="purchase-gate-title">Dijital kimliğini oluşturmak için kartını seç</h2>
              <p>Bu alan, aktif Yenomi ID hizmetin olduğunda kullanıma açılır. NFC + QR kartını satın alarak profilini oluşturabilir ve bağlantılarını yönetmeye başlayabilirsin.</p>
              <div className={styles.purchaseGateActions}>
                <Link className="yi-btn yi-btn--primary" href={INDIVIDUAL_PRODUCT_PURCHASE_HREF}>Kartını Oluştur</Link>
                <Link className="yi-btn yi-btn--secondary" href="/ayarlar">Hesap & Abonelik</Link>
              </div>
            </section>
          ) : children}
        </div>
      </section>
    </main>
  );
}
