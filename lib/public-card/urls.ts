const SHARE_PREFIX = "/p";
const EVENT_PREFIX = "/e";
const PHYSICAL_PREFIX = "/c";

export function publicCardOrigin(origin?: string) {
  const value = origin || process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "https://qr.yenomilabs.com");
  return value.replace(/\/$/, "");
}

export function cardSharePath(slug: string) {
  return `${SHARE_PREFIX}/${slug}`;
}

export function cardQrPath(publicId: string) {
  return `${SHARE_PREFIX}/${publicId}`;
}

export function cardShareUrl(slug: string, origin?: string) {
  return `${publicCardOrigin(origin)}${cardSharePath(slug)}`;
}

export function cardQrUrl(publicId: string, origin?: string) {
  return `${publicCardOrigin(origin)}${cardQrPath(publicId)}`;
}

export function cardVcardPath(publicId: string) {
  return `${SHARE_PREFIX}/${publicId}/vcard`;
}

export function eventAttributionPath(eventPublicId: string) {
  return `${EVENT_PREFIX}/${eventPublicId}`;
}

export function physicalCardPath(cardCode: string) {
  return `${PHYSICAL_PREFIX}/${cardCode}`;
}

export function looksLikePublicId(token: string) {
  return /^[A-Za-z0-9]{8,32}$/.test(token) && !token.includes("-");
}

export function createOpaquePublicId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
