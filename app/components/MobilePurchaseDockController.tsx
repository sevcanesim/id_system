"use client";

import { useEffect } from "react";

export default function MobilePurchaseDockController() {
  useEffect(() => {
    const dock = document.querySelector<HTMLElement>(".home-sales-mobile-cta");
    if (!dock) return;

    const root = document.documentElement;
    const syncDockHeight = () => {
      const height = Math.ceil(dock.getBoundingClientRect().height);
      root.style.setProperty("--rp-mobile-dock-height", `${height}px`);
    };

    syncDockHeight();
    const resizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(syncDockHeight)
      : null;
    resizeObserver?.observe(dock);
    window.addEventListener("resize", syncDockHeight, { passive: true });

    if (!("IntersectionObserver" in window)) {
      return () => {
        resizeObserver?.disconnect();
        window.removeEventListener("resize", syncDockHeight);
        root.style.removeProperty("--rp-mobile-dock-height");
      };
    }

    // The purchase dock is useful only between primary conversion moments.
    // Hide it while long-form content, a comparison or another CTA is visible:
    // a fixed control must never cover mobile table rows, links or the footer.
    const stops = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".home-sales-hero, .home-package-matrix, .home-sales-comparison, .home-sales-faq, .home-sales-final, .yi-footer--premium",
      ),
    );

    const visibleStops = new Set<Element>();
    const setDockedState = () => {
      const hidden = visibleStops.size > 0;
      dock.classList.toggle("is-docked-away", hidden);
      dock.setAttribute("aria-hidden", hidden ? "true" : "false");
      dock
        .querySelectorAll<HTMLElement>(
          "a, button, input, select, textarea, [tabindex]",
        )
        .forEach((control) => {
          if (hidden) {
            if (control.hasAttribute("tabindex")) {
              control.dataset.previousTabindex =
                control.getAttribute("tabindex") ?? "";
            }
            control.setAttribute("tabindex", "-1");
          } else if (control.dataset.previousTabindex !== undefined) {
            const previous = control.dataset.previousTabindex;
            if (previous) control.setAttribute("tabindex", previous);
            else control.removeAttribute("tabindex");
            delete control.dataset.previousTabindex;
          } else {
            control.removeAttribute("tabindex");
          }
        });
    };

    // Establish the correct first-paint state synchronously with the effect so
    // the dock does not remain active until the observer delivers its first
    // callback.
    stops.forEach((stop) => {
      const rect = stop.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        visibleStops.add(stop);
      }
    });
    setDockedState();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleStops.add(entry.target);
          else visibleStops.delete(entry.target);
        });
        setDockedState();
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

  return null;
}
