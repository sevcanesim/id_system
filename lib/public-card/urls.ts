const SHARE_PREFIX = "/p";
const EVENT_PREFIX = "/e";
const PHYSICAL_PREFIX = "/c";
const DEFAULT_PUBLIC_CARD_ORIGIN = "https://qr.yenomilabs.com";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function normalizeOrigin(candidate: string | undefined) {
  if (!candidate) return null;

  try {
    const parsedOrigin = new URL(candidate);
    if (!ALLOWED_PROTOCOLS.has(parsedOrigin.protocol)) return null;

    const isLocalOrigin = LOCAL_HOSTNAMES.has(parsedOrigin.hostname);
    const allowLocalOrigin = process.env.NODE_ENV !== "production";
    if (isLocalOrigin && !allowLocalOrigin) return null;

    return parsedOrigin.origin;
  } catch {
    return null;
  }
}

export function publicCardOrigin(origin?: string) {
  const explicitOrigin = normalizeOrigin(origin);
  if (explicitOrigin) return explicitOrigin;

  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredOrigin) return configuredOrigin;

  if (typeof window !== "undefined") {
    const browserOrigin = normalizeOrigin(window.location.origin);
    if (browserOrigin) return browserOrigin;
  }

  return DEFAULT_PUBLIC_CARD_ORIGIN;
}

export function publicCardHost(origin?: string) {
  return new URL(publicCardOrigin(origin)).host;
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
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
