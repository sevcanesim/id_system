"use client";

import { usePathname } from "next/navigation";
import AppHeader from "./AppHeader";
import AnnouncementBar from "./AnnouncementBar";
import AppFooter from "./AppFooter";

export type HeaderVariant = "marketing" | "commerce" | "support-legal" | "auth" | "checkout";

function resolveHeaderVariant(pathname: string): HeaderVariant {
  if (pathname === "/checkout" || pathname.startsWith("/checkout/") || pathname === "/nfc-siparis" || pathname === "/odeme/paytr") {
    return "checkout";
  }
  if (pathname === "/giris" || pathname.startsWith("/giris/")) {
    return "auth";
  }
  if (
    [
      /^\/destek(?:\/|$)/,
      /^\/gizlilik(?:\/|$)/,
      /^\/kvkk(?:\/|$)/,
      /^\/iade-iptal(?:\/|$)/,
      /^\/mesafeli-satis-sozlesmesi(?:\/|$)/,
      /^\/hizmet-sartlari(?:\/|$)/,
    ].some((pattern) => pattern.test(pathname))
  ) {
    return "support-legal";
  }
  if (pathname === "/urunler" || pathname.startsWith("/urunler/") || pathname === "/sepet") {
    return "commerce";
  }
  return "marketing";
}

function isPublicSiteSurface(pathname: string) {
  if (pathname === "/odeme/paytr") return true;
  const excluded = [
    /^\/admin(?:\/|$)/,
    /^\/kurumsal\/panel(?:\/|$)/,
    /^\/bireysel\/panel(?:\/|$)/,
    /^\/panel(?:\/|$)/,
    /^\/p(?:\/|$)/,
    /^\/c(?:\/|$)/,
    /^\/e(?:\/|$)/,
    /^\/aktivasyon(?:\/|$)/,
    /^\/odeme(?:\/|$)/,
    /^\/kurumsal\/davet(?:\/|$)/,
    /^\/kartim(?:\/|$)/,
    /^\/kartlarim(?:\/|$)/,
    /^\/olustur(?:\/|$)/,
    /^\/istatistikler(?:\/|$)/,
    /^\/leadler(?:\/|$)/,
    /^\/siparislerim(?:\/|$)/,
    /^\/yenile(?:\/|$)/,
    /^\/ayarlar(?:\/|$)/,
    /^\/hesabim(?:\/|$)/,
  ];
  return !excluded.some((pattern) => pattern.test(pathname));
}

function publicHeaderActions(pathname: string) {
  if (pathname === "/kurumsal") return [{ href: "#business-pricing-title", label: "Ekibine uygun planı seç", primary: true }];
  if (pathname.startsWith("/urunler/nfc-kart")) return [{ href: "/urunler/nfc-kart?paket=premium#nfc-hero-price-row", label: "Premium’u keşfet", primary: true }];
  return [];
}

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicSiteSurface(pathname);

  if (!isPublic) return <>{children}</>;

  const variant = resolveHeaderVariant(pathname);
  const showAnnouncement = variant !== "checkout";
  const compactFooter = variant !== "marketing";

  return (
    <>
      <div className="public-site-chrome">
        {showAnnouncement && <AnnouncementBar />}
        <AppHeader
          variant={variant}
          actions={publicHeaderActions(pathname)}
          showDefaultCta={variant === "marketing" || variant === "commerce"}
        />
      </div>
      <div className={`public-site public-site--${variant}`}>{children}</div>
      <AppFooter variant={compactFooter ? "compact" : "default"} />
    </>
  );
}
