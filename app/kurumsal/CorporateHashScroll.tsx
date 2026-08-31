"use client";

import { useEffect } from "react";

function scrollToCurrentHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const targetId = decodeURIComponent(hash);
  const target = document.getElementById(targetId);
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export default function CorporateHashScroll() {
  useEffect(() => {
    scrollToCurrentHash();
    window.addEventListener("hashchange", scrollToCurrentHash);
    return () => window.removeEventListener("hashchange", scrollToCurrentHash);
  }, []);

  return null;
}
