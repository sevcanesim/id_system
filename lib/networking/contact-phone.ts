const PHONE_FORMATTING_PATTERN = /[\s().-]/g;
const PHONE_CHARACTERS_PATTERN = /^\+?[\d\s().-]+$/;
const NORMALIZED_PHONE_PATTERN = /^\+?\d{8,15}$/;

export type ContactPhoneValidation =
  | { valid: true; value: string | null }
  | { valid: false; value: null };

export function normalizeContactPhone(rawPhone: string | null | undefined): ContactPhoneValidation {
  const trimmedPhone = rawPhone?.trim() ?? "";
  if (!trimmedPhone) return { valid: true, value: null };
  if (!PHONE_CHARACTERS_PATTERN.test(trimmedPhone)) return { valid: false, value: null };

  const normalizedPhone = trimmedPhone.replace(PHONE_FORMATTING_PATTERN, "");
  if (!NORMALIZED_PHONE_PATTERN.test(normalizedPhone)) return { valid: false, value: null };

  return { valid: true, value: normalizedPhone };
}
