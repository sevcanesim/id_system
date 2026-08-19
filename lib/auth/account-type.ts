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

export function wrongPortalMessage(accountType: AccountType, testScope?: TestLoginScope | null) {
  const corporatePortal = accountType === "CORPORATE" || accountType === "TEST" && testScope === "CORPORATE";
  return corporatePortal
    ? "Bu hesap kurumsal hesaptır. Lütfen Kurumsal / Ekip sekmesini kullanın."
    : "Bu hesap bireysel hesaptır. Lütfen Bireysel Giriş sekmesini kullanın.";
}
