import type { Metadata } from "next";
import { headers } from "next/headers";

import "./styles/canonical-foundation.css";
import "./canonical.css";
import "./design-tokens.css";
import "./design-system.css";
import "./employee-management.css";
import "./theme-policy.css";
import "./public-chrome-premium.css";
import "./authentic-enterprise.css";
import "./homepage.css";
import "./homepage-responsive.css";
import "./ui-contract-v25.css";
import "./public-header-unified.css";
import "./public-system.css";
import "./styles/canonical-public.css";
import "./styles/canonical-paytr.css";
import "./styles/canonical-account.css";
import "./styles/canonical-corporate.css";
import "./styles/canonical-corporate-responsive.css";
import "./styles/canonical-auth.css";
import "./styles/canonical-motion.css";
import "./styles/canonical-footer.css";
import "./styles/canonical-responsive-final.css";
import "./styles/premium-loading.css";
import "./mobile-canonical.css";
import "./styles/public-profile-canonical.css";
import "./styles/canonical-networking.css";
import "./styles/canonical-responsive-production.css";
import "./styles/home-products-responsive.css";
import "./styles/canonical-package-matrix.css";
import "./styles/unified-sidebar.css";
import "./typography-system.css";
import "./styles/canonical-transaction-states.css";
import HashScrollHandler from "./components/HashScrollHandler";
import AuthSessionBridge from "./components/AuthSessionBridge";
import MobilePurchaseDockController from "./components/MobilePurchaseDockController";
import PublicSiteShell from "./components/PublicSiteShell";
import { NoticeProvider } from "./components/ui/NotificationCenter";
import { publicCardOrigin } from "../lib/public-card/urls";

const siteOrigin = publicCardOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Yenomi ID | Her tanışmada güncel kal",
    template: "%s | Yenomi ID",
  },
  description: "NFC + QR kartvizit. Kendini tek dokunuşla tanıt, profesyonel kimliğini güncel tut ve bağlantılarını takipte kal.",
  applicationName: "Yenomi ID",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Yenomi ID",
    title: "Yenomi ID | Her tanışmada güncel kal",
    description: "NFC + QR kartvizit. Kendini tek dokunuşla tanıt, profesyonel kimliğini güncel tut ve bağlantılarını güvenle yönet.",
    url: siteOrigin,
    images: ["/images/yenomilabs-share.png"],
  },
  twitter: {
    card: "summary",
    title: "Yenomi ID | Her tanışmada güncel kal",
    description: "NFC + QR kartvizit. Kendini tek dokunuşla tanıt, profesyonel kimliğini güncel tut ve bağlantılarını güvenle yönet.",
    images: ["/images/yenomilabs-share.png"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="tr" suppressHydrationWarning={Boolean(nonce)}>
      <head />
      <body><a className="yi-skip-link" href="#main-content">Ana içeriğe geç</a><NoticeProvider><AuthSessionBridge /><HashScrollHandler /><MobilePurchaseDockController /><PublicSiteShell>{children}</PublicSiteShell></NoticeProvider></body>
    </html>
  );
}
