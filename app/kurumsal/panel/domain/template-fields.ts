const LOCK_KEYS = ["lockName", "lockCompany", "lockTitle", "lockEmail", "lockPhone"] as const;

/**
 * Compatibility normalization for templates saved before the tri-state field
 * policy existed. This is intentionally pure so the corporate panel does not
 * own migration/normalization concerns.
 */
export function normalizeLockFields(
  fields: Record<string, string | boolean>,
): Record<string, string | boolean> {
  const normalized: Record<string, string | boolean> = { ...fields };
  for (const key of LOCK_KEYS) {
    const raw = fields[key];
    if (raw === true) normalized[key] = "locked";
    else if (raw === false) normalized[key] = "free";
  }
  return normalized;
}
