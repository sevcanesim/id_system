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
    /^\/aktivasyon(?:\/|$)/,
    /^\/odeme(?:\/|$)/,
    /^\/kurumsal\/davet(?:\/|$)/,
  ];
  return !excluded.some((pattern) => pattern.test(pathname));
}

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicSiteSurface(pathname);

  if (!isPublic) return <>{children}</>;

  return (
    <>
      <div className="public-site-chrome">
        <AnnouncementBar />
        <AppHeader landing />
      </div>
      {children}
      <AppFooter />
    </>
  );
}
