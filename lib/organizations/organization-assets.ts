const ORGANIZATION_ASSET_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(catalog|presentation|meeting|references)-\d+\.pdf$/i;

type StorageAdmin = {
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export function isOrganizationAssetPath(value: string) {
  return ORGANIZATION_ASSET_PATH.test(value.trim());
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
