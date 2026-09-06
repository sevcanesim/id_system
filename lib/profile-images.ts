const PROFILE_IMAGE_BUCKET = "profile-images";
const LEGACY_PUBLIC_IMAGE_PREFIX = "/storage/v1/object/public/profile-images/";
const PROFILE_IMAGE_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/profile-(?:[0-9a-f-]{36}|[0-9]{10,20})\.(?:jpe?g|png|webp)$/i;

export { PROFILE_IMAGE_BUCKET };

export function profileImagePathFromValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (PROFILE_IMAGE_PATH_RE.test(normalized)) return normalized;

  try {
    const url = new URL(normalized);
    const markerIndex = url.pathname.indexOf(LEGACY_PUBLIC_IMAGE_PREFIX);
    if (markerIndex === -1) return null;
    const candidate = decodeURIComponent(url.pathname.slice(markerIndex + LEGACY_PUBLIC_IMAGE_PREFIX.length));
    return PROFILE_IMAGE_PATH_RE.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function isProfileImagePathOwnedBy(path: string | null | undefined, userId: string): boolean {
  return Boolean(path && PROFILE_IMAGE_PATH_RE.test(path) && path.startsWith(`${userId}/`));
}

export function publicProfileImagePath(publicId: string): string {
  return `/api/public/profile-images/${encodeURIComponent(publicId)}`;
}

export function ownProfileImagePath(path: string): string {
  return `/api/profile-images/own?path=${encodeURIComponent(path)}`;
}
