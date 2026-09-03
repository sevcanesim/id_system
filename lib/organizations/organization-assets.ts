const ORGANIZATION_ASSET_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(catalog|presentation|meeting|references)-\d+\.pdf$/i;

type StorageAdmin = {
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{ error: { message?: string } | null }>;
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: { message?: string } | null }>;
    };
  };
};

export function isOrganizationAssetPath(value: string) {
  return ORGANIZATION_ASSET_PATH.test(value.trim());
}

/** A scheduled asset is not public until both publication controls allow it. */
export function isOrganizationAssetPubliclyAvailable(
  isPublished: boolean | null | undefined,
  publishAt: string | null | undefined,
  now = Date.now(),
) {
  if (!isPublished) return false;
  if (!publishAt) return true;
  const publishTime = new Date(publishAt).getTime();
  return Number.isFinite(publishTime) && publishTime <= now;
}

export async function removeOrganizationAsset(admin: StorageAdmin, filePath: string | null | undefined) {
  const path = String(filePath || "").trim();
  if (!isOrganizationAssetPath(path)) return { removed: false };
  const { error } = await admin.storage.from("organization-assets").remove([path]);
  if (error) {
    console.error("organization asset remove failed", error.message || "unknown");
    return { removed: false };
  }
  return { removed: true };
}

/**
 * Corporate PDFs remain private at rest. Callers must authorize access before
 * requesting a short-lived URL, and paths are constrained to this feature's
 * immutable storage namespace.
 */
export async function createOrganizationAssetSignedUrl(
  admin: StorageAdmin,
  filePath: string | null | undefined,
  expiresIn = 900,
) {
  const path = String(filePath || "").trim();
  if (!isOrganizationAssetPath(path)) return null;

  const { data, error } = await admin.storage
    .from("organization-assets")
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    console.error("organization asset signing failed", error?.message || "unknown");
    return null;
  }
  return data.signedUrl;
}
