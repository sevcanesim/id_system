/** Login occupancy overlay. Product family and package live in lib/identity/user-types.ts. */
export type AccountType = "TEST" | "INDIVIDUAL" | "CORPORATE";
export type LoginPortal = "individual" | "business";
export type TestLoginScope = "BOTH" | "INDIVIDUAL" | "CORPORATE";

export function isPortalAllowed(accountType: AccountType, portal: LoginPortal, testScope?: TestLoginScope | null) {
  if (accountType === "TEST") {
    if (testScope === "BOTH") return true;
    return portal === "business" ? testScope === "CORPORATE" : testScope === "INDIVIDUAL";
  }
  return portal === "business" ? accountType === "CORPORATE" : accountType === "INDIVIDUAL";
}

/** Kurumsal giriş sekmesi gereken hesap — çalışan da buna dahildir. */
export function isCorporateScopedAccount(accountType: AccountType, testScope?: TestLoginScope | null) {
  if (accountType === "CORPORATE") return true;
  return accountType === "TEST" && testScope === "CORPORATE";
}

/**
 * Kartım / Kartlarım kabuğu: bireysel hesaplar ve kurumsal çalışanlar.
 * Yönetici girişi hâlâ iş portalındadır; çalışan yönetim paneline düşmez.
 */
export function canUseCardWorkspace(accountType: AccountType, testScope?: TestLoginScope | null) {
  return isPortalAllowed(accountType, "individual", testScope) || isCorporateScopedAccount(accountType, testScope);
}

export function wrongPortalMessage(accountType: AccountType, testScope?: TestLoginScope | null) {
  const corporatePortal = accountType === "CORPORATE" || accountType === "TEST" && testScope === "CORPORATE";
  return corporatePortal
    ? "Bu hesap kurumsal hesaptır. Lütfen Kurumsal / Ekip sekmesini kullanın."
    : "Bu hesap bireysel hesaptır. Lütfen Bireysel Giriş sekmesini kullanın.";
}
