import type { Metadata } from "next";
import { headers } from "next/headers";

import "./canonical.css";
import "./styles/canonical-corporate.css";
import "./design-tokens.css";
import "./design-system.css";
import "./employee-management.css";
import "./theme-policy.css";
import "./public-chrome-premium.css";
import "./authentic-enterprise.css";
import "./homepage.css";
import "./homepage-responsive.css";
import "./ui-contract-v25.css";
import "./kurumsal/panel/employee-action-first.css";
import "./public-header-unified.css";
import "./public-system.css";
import "./styles/canonical-public.css";
import "./styles/canonical-auth.css";
import "./styles/canonical-motion.css";
import "./styles/canonical-footer.css";
import "./styles/canonical-responsive-final.css";
import "./kurumsal/panel/overview-polish.css";
import "./kurumsal/panel/template-studio.css";
import "./kurumsal/panel/card-editor-scroll.css";
import "./mobile-canonical.css";
import "./kurumsal/panel/card-editor-polish.css";
import "./styles/public-profile-canonical.css";
import "./styles/canonical-networking.css";
import "./kurumsal/panel/card-inventory-separation.css";
import "./kurumsal/panel/networking-inbox.css";
import "./kurumsal/panel/corporate-consistency-pass.css";
import HashScrollHandler from "./components/HashScrollHandler";
import AuthSessionBridge from "./components/AuthSessionBridge";
import MobilePurchaseDockController from "./components/MobilePurchaseDockController";
import PublicSiteShell from "./components/PublicSiteShell";
import { publicCardOrigin } from "../lib/public-card/urls";

const siteOrigin = publicCardOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Yenomi ID | Kartvizitin güncel kalsın",
    template: "%s | Yenomi ID",
  },
  description: "NFC + QR kartvizit. Unvanın değişince kartı yenilemezsin. Kendin için al, ekibin için yönet. Ödeme iyzico güvencesinde.",
  applicationName: "Yenomi ID",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Yenomi ID",
    title: "Yenomi ID | Kartvizitin güncel kalsın",
    description: "NFC + QR kartvizit. Kendin için al, ekibin için yönet. Kart numarası Yenomi’de saklanmaz.",
    url: siteOrigin,
    images: ["/images/yenomilabs-share.png"],
  },
  twitter: {
    card: "summary",
    title: "Yenomi ID | Kartvizitin güncel kalsın",
    description: "NFC + QR kartvizit. Kendin için al, ekibin için yönet. Kart numarası Yenomi’de saklanmaz.",
    images: ["/images/yenomilabs-share.png"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="tr" suppressHydrationWarning={Boolean(nonce)}>
      <head />
      <body><a className="yi-skip-link" href="#main-content">Ana içeriğe geç</a><AuthSessionBridge /><HashScrollHandler /><MobilePurchaseDockController /><PublicSiteShell>{children}</PublicSiteShell></body>
    </html>
  );
}
