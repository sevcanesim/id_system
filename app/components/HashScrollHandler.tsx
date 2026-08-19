"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function scrollToCurrentHash() {
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!id) return;

  let attempts = 0;
  const findAndScroll = () => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    attempts += 1;
    if (attempts < 12) window.setTimeout(findAndScroll, 80);
  };

  requestAnimationFrame(findAndScroll);
}

export default function HashScrollHandler() {
  const pathname = usePathname();

  useEffect(() => {
    scrollToCurrentHash();
    window.addEventListener("hashchange", scrollToCurrentHash);
    return () => window.removeEventListener("hashchange", scrollToCurrentHash);
  }, [pathname]);

  return null;
}
