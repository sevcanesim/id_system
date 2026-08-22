/**
 * Production must not accept the demo/QA fixture identities.
 * `account_type = 'TEST'` is a routing overlay, not an access control — this
 * gate is the access control. Preview/staging can keep fixtures by leaving
 * VERCEL_ENV unset or setting ALLOW_TEST_LOGINS=true.
 */

const TEST_EMAIL_SUFFIX = "@yenomi.test";

export function isYenomiTestEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(TEST_EMAIL_SUFFIX);
}

export function isBlockedTestIdentity(input: {
  email?: string | null;
  accountType?: string | null;
}): boolean {
  if (input.accountType === "TEST") return true;
  return isYenomiTestEmail(input.email);
}

export function shouldBlockTestLogins(): boolean {
  if (process.env.ALLOW_TEST_LOGINS === "true") return false;
  if (process.env.YENOMI_BLOCK_TEST_LOGINS === "true") return true;
  return process.env.VERCEL_ENV === "production";
}

export function productionTestLoginBlocked(input: {
  email?: string | null;
  accountType?: string | null;
}): boolean {
  return shouldBlockTestLogins() && isBlockedTestIdentity(input);
}

export const PRODUCTION_TEST_LOGIN_MESSAGE = "Bu test hesabı üretim ortamında kullanılamaz.";
