"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatTryFromKurus } from "../../lib/config/product";
import { INDIVIDUAL_PREMIUM_PLAN } from "../../lib/commerce/packages";

const premiumPrice = formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus);
const dockStopSelector = ".home-sales-hero, .home-package-matrix, .home-sales-comparison, .home-sales-faq, .home-sales-final, .yi-footer--premium";

export function MobileStickyCta() {
  const dockRef = useRef<HTMLElement>(null);
  const [isDockVisible, setIsDockVisible] = useState(true);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const root = document.documentElement;
    const stops = Array.from(document.querySelectorAll<HTMLElement>(dockStopSelector));
    const visibleStops = new Set<Element>();

    const syncDockHeight = () => {
      const height = Math.ceil(dock.getBoundingClientRect().height);
      root.style.setProperty("--rp-mobile-dock-height", `${height}px`);
    };

    const syncDockVisibility = () => {
      setIsDockVisible(visibleStops.size === 0);
    };

    const inspectVisibleStops = () => {
      visibleStops.clear();
      stops.forEach((stop) => {
        const bounds = stop.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < window.innerHeight) {
          visibleStops.add(stop);
        }
      });
      syncDockVisibility();
    };

    syncDockHeight();
    inspectVisibleStops();

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(syncDockHeight);
    resizeObserver?.observe(dock);
    window.addEventListener("resize", syncDockHeight, { passive: true });

    if (typeof IntersectionObserver === "undefined") {
      window.addEventListener("scroll", inspectVisibleStops, { passive: true });

      return () => {
        resizeObserver?.disconnect();
        window.removeEventListener("resize", syncDockHeight);
        window.removeEventListener("scroll", inspectVisibleStops);
        root.style.removeProperty("--rp-mobile-dock-height");
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleStops.add(entry.target);
          else visibleStops.delete(entry.target);
        });
        syncDockVisibility();
      },
      { threshold: 0.01 },
    );

    stops.forEach((stop) => observer.observe(stop));

    return () => {
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncDockHeight);
      root.style.removeProperty("--rp-mobile-dock-height");
    };
  }, []);

  return (
    <aside
      ref={dockRef}
      className={`home-sales-mobile-cta${isDockVisible ? "" : " is-docked-away"}`}
      aria-label="Bireysel Premium hızlı satın alma"
      aria-hidden={!isDockVisible}
    >
      <div className="home-sales-mobile-cta__copy">
        <span>ÖNERİLEN · BİREYSEL PREMIUM</span>
        <strong>{premiumPrice} · ilk yıl erişim dahil</strong>
      </div>
      <Link
        className="home-mockup__button home-mockup__button--gold"
        href="/urunler/nfc-kart?paket=premium"
        tabIndex={isDockVisible ? undefined : -1}
      >
        Premium’a geç
      </Link>
    </aside>
  );
}
