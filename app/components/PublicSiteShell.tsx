"use client";

import { usePathname } from "next/navigation";
import AppHeader from "./AppHeader";
import AnnouncementBar from "./AnnouncementBar";
import AppFooter from "./AppFooter";

function isPublicSiteSurface(pathname: string) {
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

function isQuietPublicChrome(pathname: string) {
  return [
    /^\/giris(?:\/|$)/,
    /^\/sepet(?:\/|$)/,
    /^\/checkout(?:\/|$)/,
    /^\/nfc-siparis(?:\/|$)/,
    /^\/destek(?:\/|$)/,
    /^\/gizlilik(?:\/|$)/,
    /^\/kvkk(?:\/|$)/,
    /^\/iade-iptal(?:\/|$)/,
    /^\/mesafeli-satis-sozlesmesi(?:\/|$)/,
    /^\/hizmet-sartlari(?:\/|$)/,
  ].some((pattern) => pattern.test(pathname));
}

function publicHeaderActions(pathname: string) {
  if (pathname === "/kurumsal") return [{ href: "#business-pricing-title", label: "Paketleri İncele", primary: true }];
  if (pathname.startsWith("/urunler/nfc-kart")) return [{ href: "#nfc-hero-price-row", label: "Sepete Ekle", primary: true }];
  return [];
}

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicSiteSurface(pathname);

  if (!isPublic) return <>{children}</>;

  const quiet = isQuietPublicChrome(pathname);
  const compactFooter = quiet || pathname === "/urunler" || pathname.startsWith("/urunler/") || pathname === "/kurumsal";

  return (
    <>
      <div className="public-site-chrome">
        {!quiet && <AnnouncementBar />}
        <AppHeader landing actions={quiet ? [] : publicHeaderActions(pathname)} showDefaultCta={!quiet} />
      </div>
      {children}
      <AppFooter variant={compactFooter ? "compact" : "default"} />
    </>
  );
}
