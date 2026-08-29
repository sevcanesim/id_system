"use client";

import { useEffect } from "react";

export default function MobilePurchaseDockController() {
  useEffect(() => {
    const dock = document.querySelector<HTMLElement>(".home-sales-mobile-cta");
    if (!dock || !("IntersectionObserver" in window)) return;

    const stops = Array.from(
      document.querySelectorAll<HTMLElement>(".home-sales-final, .yi-footer--premium"),
    );
    if (stops.length === 0) return;

    const visibleStops = new Set<Element>();
    const setDockedState = () => {
      const hidden = visibleStops.size > 0;
      dock.classList.toggle("is-docked-away", hidden);
      dock.setAttribute("aria-hidden", hidden ? "true" : "false");
      dock.querySelectorAll<HTMLElement>("a, button, input, select, textarea, [tabindex]").forEach((control) => {
        if (hidden) {
          if (control.hasAttribute("tabindex")) control.dataset.previousTabindex = control.getAttribute("tabindex") ?? "";
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleStops.add(entry.target);
          else visibleStops.delete(entry.target);
        });
        setDockedState();
      },
      { rootMargin: "0px 0px 72px 0px", threshold: 0.01 },
    );

    stops.forEach((stop) => observer.observe(stop));
    return () => observer.disconnect();
  }, []);

  return null;
}
