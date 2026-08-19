/**
 * Proje genelindeki tek ikon kaynağı. Önceden sayfalarda `⌁ ↗ ＋ ✉ ⌑ ◇ ✓ ☎ ▦`
 * gibi unicode karakterler "ikon" olarak kullanılıyordu — bu karakterler
 * platforma/fonta göre farklı görünüyor, hizalanmıyor ve marka diliyle
 * uyuşmuyordu. Bu dosya, tutarlı çizgi ağırlığına (strokeWidth 1.75) ve
 * 24x24 grid'e sahip tek bir SVG ikon setidir; tüm sayfalar buradan besleniyor.
 */

import { cloneElement } from "react";

export type IconName =
  | "mail"
  | "phone"
  | "whatsapp"
  | "social"
  | "map"
  | "save"
  | "external"
  | "nfc"
  | "qr"
  | "refresh"
  | "plus"
  | "secure"
  | "analytics"
  | "contact"
  | "link"
  | "check"
  | "close"
  | "lock"
  | "chevronRight"
  | "instagram"
  | "play"
  | "alert"
  | "share"
  | "id"
  | "health"
  | "cart"
  | "shield"
  | "building"
  | "users"
  | "truck"
  | "headset"
  | "clock"
  | "copy"
  | "box"
  | "pencil"
  | "search"
  | "lock-open"
  | "adjustments"
  | "menu"
  | "chevronDown"
  | "chevronLeft"
  | "sparkles"
  | "eye"
  | "eye-off"
  | "logout";

const strokeProps = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export type IconVariant = "line" | "solid";

export function Icon({ name, className, variant = "line" }: {
  name?: IconName | string;
  className?: string;
  variant?: IconVariant;
}) {
  const svg = renderIcon(name);
  return cloneElement(svg, {
    className: ["yi-icon", `yi-icon--${variant}`, svg.props.className, className].filter(Boolean).join(" "),
    "aria-hidden": true,
  });
}

function renderIcon(name?: IconName | string) {
  switch (name) {
    case "mail":
      return <svg viewBox="0 0 24 24" {...strokeProps}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4.5 7 12 12.5 19.5 7" /></svg>;
    case "phone":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M22 16.9v2.6a1.8 1.8 0 0 1-2 1.8A17.8 17.8 0 0 1 2.7 4a1.8 1.8 0 0 1 1.8-2H7a1.8 1.8 0 0 1 1.8 1.6c.1 1 .3 2 .7 2.9a1.8 1.8 0 0 1-.4 1.9l-1.1 1.1a14.4 14.4 0 0 0 6.5 6.5l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.9.4 1.9.6 2.9.7A1.8 1.8 0 0 1 22 16.9Z" /></svg>;
    case "whatsapp":
      return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2.2A9.72 9.72 0 0 0 2.3 11.9c0 1.72.45 3.4 1.31 4.88L2.2 21.8l5.16-1.35a9.67 9.67 0 0 0 4.67 1.2h.01a9.72 9.72 0 0 0 0-19.44Zm0 17.8h-.01a8.02 8.02 0 0 1-4.08-1.12l-.29-.17-3.06.8.82-2.98-.19-.31a8.03 8.03 0 1 1 6.81 3.78Zm4.4-6.02c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" /></svg>;
    case "social":
    case "instagram":
      if (name === "instagram") return <svg viewBox="0 0 24 24" {...strokeProps}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>;
      return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.8 8.9H3.9V20h2.9V8.9Zm-1.5-4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM20.1 13.7c0-3.3-1.8-4.9-4.2-4.9-1.9 0-2.8 1.1-3.2 1.8V8.9h-2.9V20h2.9v-6.2c0-.3 0-.7.1-.9.3-.7.9-1.4 2-1.4 1.4 0 2 1.1 2 2.7V20h2.9v-6.3Z" /></svg>;
    case "play":
      return <svg viewBox="0 0 24 24" {...strokeProps}><circle cx="12" cy="12" r="9" /><path d="m10 8.5 6 3.5-6 3.5Z" /></svg>;
    case "map":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "save":
    case "contact":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M15 19a6 6 0 0 0-12 0" /><circle cx="9" cy="8" r="3" /><path d="M19 8v6" /><path d="M16 11h6" /></svg>;
    case "nfc":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M7 8c4 2.5 4 5.5 0 8M10.5 5.5c6.5 3.5 6.5 9.5 0 13M14 3c9 4.5 9 13.5 0 18" /></svg>;
    case "qr":
      return <svg viewBox="0 0 32 32" {...strokeProps}><path d="M3 12V3h9M20 3h9v9M29 20v9h-9M12 29H3v-9" /><rect x="8" y="8" width="7" height="7" rx="1" /><rect x="18" y="18" width="6" height="6" rx="1" /><path d="M20 9h3v3h-3zM9 20h3v3H9zM14 18h2v2h-2zM25 14h3v3h-3z" fill="currentColor" stroke="none" /></svg>;
    case "refresh":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M20 8V4l-2.5 2.5A8.5 8.5 0 1 0 20 14" /><path d="M20 4v4h-4" /></svg>;
    case "plus":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M12 5v14M5 12h14" /></svg>;
    case "secure":
    case "lock":
      return <svg viewBox="0 0 24 24" {...strokeProps}><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" /></svg>;
    case "lock-open":
      return <svg viewBox="0 0 24 24" {...strokeProps}><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 7.5-3.9" /><circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" /></svg>;
    case "adjustments":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M4 7h9M17 7h3M4 17h3M9 17h11" /><circle cx="14" cy="7" r="2.3" /><circle cx="7" cy="17" r="2.3" /></svg>;
    case "analytics":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M4.5 20V13M11 20V6M17.5 20v-6.5M4.5 20h15" /></svg>;
    case "check":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M4.5 12.5 9.5 17.5 19.5 6.5" /></svg>;
    case "close":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "chevronRight":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...strokeProps}><path d="M8 5l8 7-8 7" /></svg>;
    case "chevronLeft":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...strokeProps}><path d="M16 5l-8 7 8 7" /></svg>;
    case "chevronDown":
      return <svg viewBox="0 0 24 24" width="16" height="16" {...strokeProps}><path d="m6 9 6 6 6-6" /></svg>;
    case "logout":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M15 4.5h3.5A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5H15" /><path d="M10 12h9" /><path d="m16.5 8.5 3.5 3.5-3.5 3.5" /><path d="M12 19.5H6.5A2.5 2.5 0 0 1 4 17V7a2.5 2.5 0 0 1 2.5-2.5H12" /></svg>;
    case "menu":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "eye":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "eye-off":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="m3 3 18 18" /><path d="M10.6 6.2A10.2 10.2 0 0 1 12 6c6.1 0 9.5 6 9.5 6a17.6 17.6 0 0 1-3 3.7M6.2 6.8C3.9 8.4 2.5 12 2.5 12s3.4 6 9.5 6c1.4 0 2.7-.3 3.8-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
    case "sparkles":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="m12 3 1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></svg>;
    case "alert":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M12 3.5 21.5 20h-19L12 3.5Z" /><path d="M12 9.5v4.5" /><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" /></svg>;
    case "share":
      return <svg viewBox="0 0 24 24" {...strokeProps}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.7 15.8 6.3M8.2 13.3l7.6 4.4" /></svg>;
    case "id":
      return <svg viewBox="0 0 24 24" {...strokeProps}><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="8.5" cy="12" r="2" /><path d="M6 16.5c.6-1.4 1.6-2 2.5-2s1.9.6 2.5 2M14 9.5h5M14 13h5M14 16.5h3" /></svg>;
    case "health":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M12 20.5S3.5 15.2 3.5 9.3C3.5 6.4 5.8 4.2 8.6 4.2c1.6 0 3 .8 3.4 2 .4-1.2 1.8-2 3.4-2 2.8 0 5.1 2.2 5.1 5.1 0 5.9-8.5 11.2-8.5 11.2Z" /><path d="M8.5 12h2l1.2-2.4 1.6 4.8 1.2-2.4h2" /></svg>;
    case "cart":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M3.5 4.5h2.2l1 12.4a2 2 0 0 0 2 1.85h8.6a2 2 0 0 0 2-1.75l1.2-8.15H6.9" /><circle cx="9.5" cy="21" r="1.35" fill="currentColor" stroke="none" /><circle cx="17" cy="21" r="1.35" fill="currentColor" stroke="none" /></svg>;
    case "shield":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M12 3.5 19 6v5.4c0 4.6-3 7.9-7 9.1-4-1.2-7-4.5-7-9.1V6Z" /><path d="M8.7 12.2l2.1 2.1 4.3-4.5" /></svg>;
    case "building":
      return <svg viewBox="0 0 24 24" {...strokeProps}><rect x="5" y="3.5" width="10" height="17" rx="1.5" /><path d="M15 9.5h4v11h-4" /><path d="M8.3 7.5h.01M11.7 7.5h.01M8.3 11h.01M11.7 11h.01M8.3 14.5h.01M11.7 14.5h.01" /></svg>;
    case "users":
      return <svg viewBox="0 0 24 24" {...strokeProps}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M15.5 6.2a3 3 0 0 1 0 5.7" /><path d="M17 13.3a5.5 5.5 0 0 1 3.5 5.1" /></svg>;
    case "truck":
      return <svg viewBox="0 0 24 24" {...strokeProps}><rect x="2.5" y="7" width="12" height="9" rx="1.3" /><path d="M14.5 10h4l3 3.2V16h-7z" /><circle cx="7" cy="18.2" r="1.7" /><circle cx="17.3" cy="18.2" r="1.7" /></svg>;
    case "headset":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4.2" height="6" rx="1.6" /><rect x="16.8" y="13" width="4.2" height="6" rx="1.6" /><path d="M18.8 19v.6a3 3 0 0 1-3 3h-2.3" /></svg>;
    case "clock":
      return <svg viewBox="0 0 24 24" {...strokeProps}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
    case "copy":
      return <svg viewBox="0 0 24 24" {...strokeProps}><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5" /></svg>;
    case "box":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M3.5 8.2 12 4l8.5 4.2v7.6L12 20l-8.5-4.2Z" /><path d="M3.5 8.2 12 12l8.5-4.2" /><path d="M12 12v8" /></svg>;
    case "pencil":
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14 7.5 16.5 10" /></svg>;
    case "search":
      return <svg viewBox="0 0 24 24" {...strokeProps}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
    case "external":
    case "link":
    default:
      return <svg viewBox="0 0 24 24" {...strokeProps}><path d="M10 14L21 3" /><path d="M15 3h6v6" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>;
  }
}

export function Arrow() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 5l8 7-8 7" /></svg>;
}
