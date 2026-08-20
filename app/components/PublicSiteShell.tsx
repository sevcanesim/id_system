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
  ];
  return !excluded.some((pattern) => pattern.test(pathname));
}

function isQuietPublicChrome(pathname: string) {
  return [
    /^\/giris(?:\/|$)/,
    /^\/sepet(?:\/|$)/,
    /^\/checkout(?:\/|$)/,
    /^\/nfc-siparis(?:\/|$)/,
  ].some((pattern) => pattern.test(pathname));
}

function publicHeaderActions(pathname: string) {
  if (pathname === "/kurumsal") return [{ href: "/kurumsal#teklif", label: "Teklif Al", primary: true }];
  if (pathname.startsWith("/destek")) return [{ href: "mailto:hello@yenomilabs.com", label: "Destek Yazın", primary: true }];
  if (pathname.startsWith("/urunler/nfc-kart")) return [{ href: "#nfc-hero-price-row", label: "Sepete Ekle", primary: true }];
  return [];
}

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicSiteSurface(pathname);

  if (!isPublic) return <>{children}</>;

  const quiet = isQuietPublicChrome(pathname);

  return (
    <>
      <div className="public-site-chrome">
        {!quiet && <AnnouncementBar />}
        <AppHeader landing actions={quiet ? [] : publicHeaderActions(pathname)} showDefaultCta={!quiet} />
      </div>
      {children}
      <AppFooter variant={quiet ? "compact" : "default"} />
    </>
  );
}
