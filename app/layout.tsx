import type { Metadata } from "next";






import "./canonical.css";
import "./design-tokens.css";
import "./design-system.css";
import "./employee-management.css";
import "./theme-policy.css";
import HashScrollHandler from "./components/HashScrollHandler";
import AuthSessionBridge from "./components/AuthSessionBridge";
import PublicSiteShell from "./components/PublicSiteShell";

export const metadata: Metadata = {
  metadataBase: new URL("https://qr.yenomilabs.com"),
  title: {
    default: "Yenomi ID | Dijital kartvizit",
    template: "%s | Yenomi ID",
  },
  description: "Yenomi ID dijital kartvizit: bireysel NFC + QR kart veya kurumsal ekip yönetimi. Canlı profil, görüntülenme ve bağlantı takibi.",
  applicationName: "Yenomi ID",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Yenomi ID",
    title: "Yenomi ID | Dijital kartvizit",
    description: "Bireysel veya kurumsal dijital kartvizit. NFC + QR kart, canlı profil ve görüntülenme takibi.",
    url: "https://qr.yenomilabs.com",
    images: ["/images/yenomilabs-share.png"],
  },
  twitter: {
    card: "summary",
    title: "Yenomi ID | Dijital kartvizit",
    description: "Bireysel veya kurumsal dijital kartvizit. NFC + QR kart, canlı profil ve görüntülenme takibi.",
    images: ["/images/yenomilabs-share.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <head />
      <body><a className="yi-skip-link" href="#main-content">Ana içeriğe geç</a><AuthSessionBridge /><HashScrollHandler /><PublicSiteShell>{children}</PublicSiteShell></body>
    </html>
  );
}
