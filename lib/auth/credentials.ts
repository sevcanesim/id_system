export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return "E-posta adresini yazmalısın.";
  if (email.length > 254) return "E-posta adresi çok uzun.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Geçerli bir e-posta adresi yazmalısın.";
  return null;
}

export const SIGNUP_PASSWORD_RULES = [
  { key: "length", label: "En az 8 karakter", test: (value: string) => value.length >= 8 },
  { key: "lowercase", label: "En az bir küçük harf", test: (value: string) => /[a-zçğıöşü]/.test(value) },
  { key: "uppercase", label: "En az bir büyük harf", test: (value: string) => /[A-ZÇĞİÖŞÜ]/.test(value) },
  { key: "number", label: "En az bir rakam", test: (value: string) => /\d/.test(value) },
] as const;

export function validateSignupPassword(value: string): string | null {
  if (value.length > 72) return "Şifre en fazla 72 karakter olabilir.";
  const failed = SIGNUP_PASSWORD_RULES.find((rule) => !rule.test(value));
  return failed ? `Şifre kuralı eksik: ${failed.label.toLocaleLowerCase("tr-TR")}.` : null;
}
