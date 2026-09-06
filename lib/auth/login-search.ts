import type { AccountType, LoginPortal, TestLoginScope } from "./account-type";

export type LoginAuthMode = "login" | "signup" | "forgot" | "recovery";

export const DEFAULT_INDIVIDUAL_NEXT = "/kartim";
export const DEFAULT_BUSINESS_NEXT = "/kurumsal/panel";

const DEFAULT_WORKSPACE_PATHS = new Set([
  DEFAULT_INDIVIDUAL_NEXT,
  DEFAULT_BUSINESS_NEXT,
  "/hesabim",
  "/kartlarim",
]);

export const LOGIN_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "E-posta veya şifre hatalı.",
  RATE_LIMITED: "Çok fazla giriş denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin.",
  TEST_ACCOUNT_BLOCKED: "Bu test hesabı üretim ortamında kullanılamaz.",
  LOGIN_UNAVAILABLE: "Giriş şu anda tamamlanamıyor. Lütfen yeniden dene.",
  WRONG_PORTAL_CORPORATE: "Bu hesap kurumsal hesaptır. Lütfen Kurumsal / Ekip sekmesini kullanın.",
  WRONG_PORTAL_INDIVIDUAL: "Bu hesap bireysel hesaptır. Lütfen Bireysel Giriş sekmesini kullanın.",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERROR_MESSAGES;

export function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function safeLoginNext(value: string | null | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/giris")
    ? value
    : DEFAULT_INDIVIDUAL_NEXT;
}

export function parseLoginPortal(value: string | null | undefined): LoginPortal {
  return value === "business" ? "business" : "individual";
}

export function parseLoginMode(value: string | null | undefined): LoginAuthMode {
  if (value === "signup" || value === "forgot" || value === "recovery") return value;
  return "login";
}

export function resolveLoginReturnPath(portal: LoginPortal, nextParam: string | null | undefined) {
  const next = safeLoginNext(nextParam);
  if (DEFAULT_WORKSPACE_PATHS.has(next)) {
    return portal === "business" ? DEFAULT_BUSINESS_NEXT : DEFAULT_INDIVIDUAL_NEXT;
  }
  return next;
}

export function isLoginErrorCode(value: string | null | undefined): value is LoginErrorCode {
  return Boolean(value && value in LOGIN_ERROR_MESSAGES);
}

export function loginErrorMessage(code: string | null | undefined) {
  return isLoginErrorCode(code) ? LOGIN_ERROR_MESSAGES[code] : "";
}

export function wrongPortalErrorCode(
  accountType: AccountType,
  testScope?: TestLoginScope | null,
): Extract<LoginErrorCode, "WRONG_PORTAL_CORPORATE" | "WRONG_PORTAL_INDIVIDUAL"> {
  const corporatePortal = accountType === "CORPORATE" || accountType === "TEST" && testScope === "CORPORATE";
  return corporatePortal ? "WRONG_PORTAL_CORPORATE" : "WRONG_PORTAL_INDIVIDUAL";
}

export function loginPagePath(
  portal: LoginPortal,
  nextPath: string,
  extra?: Partial<Record<"error" | "mode", string>>,
) {
  const params = new URLSearchParams({ portal });
  const next = resolveLoginReturnPath(portal, nextPath);
  if (next && next !== DEFAULT_INDIVIDUAL_NEXT) params.set("next", next);
  if (extra?.mode === "recovery") params.set("mode", "recovery");
  if (extra?.error && isLoginErrorCode(extra.error)) params.set("error", extra.error);
  return `/giris?${params.toString()}`;
}
