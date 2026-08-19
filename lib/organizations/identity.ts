/** Canonical identity helpers for corporate UI. */
export function normalizeIdentityName(value: string | null | undefined, fallback = "Kurumsal Kullanıcı") {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

/**
 * Initials intentionally ignore standalone numeric tokens so names such as
 * "Demo 5 Tam Dolu" become "DT", not the misleading "D5".
 */
export function getIdentityInitials(value: string | null | undefined, fallback = "YK") {
  const name = normalizeIdentityName(value, "");
  const tokens = name.split(" ").filter(Boolean);
  const alphaTokens = tokens.filter((token) => /[\p{L}]/u.test(token));
  const source = alphaTokens.length >= 2 ? alphaTokens : tokens;
  const initials = source
    .slice(0, 2)
    .map((token) => token.match(/[\p{L}]/u)?.[0] || "")
    .join("")
    .toLocaleUpperCase("tr-TR");
  return initials || fallback;
}
