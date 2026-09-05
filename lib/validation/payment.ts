export function normalizeIdentityNumber(value: unknown, type: "TR" | "FOREIGN"): string {
  const raw = String(value ?? "");
  return type === "TR"
    ? raw.replace(/\D/g, "")
    : raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidTurkishIdentityNumber(value: string): boolean {
  if (!/^\d{11}$/.test(value) || value[0] === "0") return false;
  const digits = value.split("").map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenthDigit = ((oddSum * 7) - evenSum) % 10;
  const eleventhDigit = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;
  return digits[9] === tenthDigit && digits[10] === eleventhDigit;
}

export function isValidIdentityNumber(value: string, type: "TR" | "FOREIGN"): boolean {
  return type === "TR" ? isValidTurkishIdentityNumber(value) : /^[A-Z0-9]{5,20}$/.test(value);
}
