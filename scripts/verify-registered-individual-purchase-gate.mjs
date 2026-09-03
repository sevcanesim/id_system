import fs from "node:fs";

const shell = fs.readFileSync("app/ui/DashboardShell.tsx", "utf8");
const entitlementRoute = fs.readFileSync("app/api/commerce/entitlements/route.ts", "utf8");
const wizard = fs.readFileSync("app/olustur/CardWizard.tsx", "utf8");
const decision = fs.readFileSync("lib/commerce/individual-portal-access.ts", "utf8");

for (const marker of [
  "needsIndividualProductPurchase",
  "INDIVIDUAL_PRODUCT_PURCHASE_HREF",
  "hasCorporateMembership",
  "activeKey !== \"account\"",
  "purchase-required",
  "NFC Kartını Satın Al",
]) {
  if (!shell.includes(marker)) throw new Error(`Portal purchase gate marker missing: ${marker}`);
}

if (shell.includes("window.location.replace(INDIVIDUAL_PRODUCT_PURCHASE_HREF)")) {
  throw new Error("The product gate must keep users in the panel until they choose to purchase.");
}

for (const marker of ["pendingEntitlements", "PENDING_ACTIVATION", "INDIVIDUAL_PRODUCT_PURCHASE_HREF"]) {
  if (!entitlementRoute.includes(marker)) throw new Error(`Entitlement gate marker missing: ${marker}`);
}

if (!wizard.includes("INDIVIDUAL_PRODUCT_PURCHASE_HREF")) {
  throw new Error("Card wizard must use the same individual purchase destination.");
}

if (wizard.includes("router.replace(entitlementPayload.next || INDIVIDUAL_PRODUCT_PURCHASE_HREF)")) {
  throw new Error("Card wizard must preserve the panel purchase gate for an unpurchased account.");
}

if (!decision.includes("!input.hasActiveEntitlement && !input.hasRenewalEntitlement && !input.hasPendingEntitlement")) {
  throw new Error("Purchase decision must require a genuinely unpurchased individual account.");
}

console.log("Registered individual purchase gate contract PASS.");
