import fs from "node:fs";
import { readFileSync } from "node:fs";

const required = [
  "app/urunler/nfc-kart/NfcPurchasePanel.tsx",
  "app/components/ui/ProductVariantSelector.tsx",
  "app/components/AddToCartButton.tsx",
  "app/urunler/nfc-kart/MobileBuyBar.tsx",
];

for (const file of required) {
  readFileSync(file, "utf8");
}

const panel = readFileSync(required[0], "utf8");
const selector = readFileSync(required[1], "utf8");
const button = readFileSync(required[2], "utf8");

for (const token of ["ProductVariantSelector", "selectedVariant", "variantId", "variantName"]) {
  if (!panel.includes(token)) throw new Error(`Missing PDP variant contract: ${token}`);
}
for (const token of ['type="radio"', "checked={selected}", "ds-product-option--selected"]) {
  if (!selector.includes(token)) throw new Error(`Missing accessible variant contract: ${token}`);
}
if (!button.includes("configuration")) throw new Error("AddToCartButton must carry product configuration.");

const ownedCss = [
  "app/canonical.css",
  "app/design-tokens.css",
  "app/design-system.css",
  "app/employee-management.css",
  "app/theme-policy.css",
];
const retiredCss = [
  "app/globals.css",
  "app/legacy-surfaces.css",
  "app/public-conversion.css",
  "app/commerce-flow.css",
  "app/auth-flow.css",
  "app/dashboard-flow.css",
  "app/public-card.css",
  "app/qr.css",
];
for (const file of retiredCss) {
  if (fs.existsSync(file)) throw new Error(`Retired split stylesheet must stay deleted: ${file}`);
}

let cssLines = 0;
let important = 0;
for (const file of ownedCss) {
  const css = readFileSync(file, "utf8");
  cssLines += css.split(/\r?\n/).length;
  important += (css.match(/!important/g) || []).length;
}
console.log("Phase 21 product variant UX: PASS");
console.log(`CSS files: ${ownedCss.length}`);
console.log(`CSS lines: ${cssLines}`);
console.log(`!important: ${important}`);
