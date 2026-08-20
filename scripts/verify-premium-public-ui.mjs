import fs from "node:fs";

const required = [
  "app/design-tokens.css",
  "app/canonical.css",
  "app/LandingClient.tsx",
  "app/urunler/page.tsx",
  "app/urunler/nfc-kart/page.tsx",
  "app/kurumsal/page.tsx",
  "app/layout.tsx",
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing premium UI file: ${file}`);
}

for (const retired of ["app/commerce-flow.css", "app/public-conversion.css", "app/auth-flow.css"]) {
  if (fs.existsSync(retired)) throw new Error(`Retired split stylesheet must stay deleted: ${retired}`);
}

const layout = fs.readFileSync("app/layout.tsx", "utf8");
if (!layout.includes('import "./canonical.css"')) throw new Error("Canonical stylesheet is not imported.");
if (!layout.includes("design-tokens.css")) throw new Error("Canonical design token layer is not imported.");
if (layout.includes("public-conversion.css") || layout.includes("commerce-flow.css") || layout.includes("auth-flow.css")) {
  throw new Error("Retired split stylesheets must not be imported.");
}

const tokens = fs.readFileSync("app/design-tokens.css", "utf8");
const canonical = fs.readFileSync("app/canonical.css", "utf8");

for (const token of [".p4-public-home", "@media (max-width: 760px)", "prefers-reduced-motion"]) {
  if (!canonical.includes(token) && !(token === "@media (max-width: 760px)" && canonical.includes("@media(max-width:760px)"))) {
    throw new Error(`Premium UI contract missing: ${token}`);
  }
}
for (const token of [".p6-auth-page", "prefers-reduced-motion"]) {
  if (!canonical.includes(token)) throw new Error(`Premium auth UI contract missing: ${token}`);
}
for (const token of [".nfc-product-page", ".cart-page", ".checkout-page"]) {
  if (!canonical.includes(token)) throw new Error(`Premium commerce UI contract missing: ${token}`);
}
for (const token of ["--surface-base", "--brand-gold", "#F9F8F6"]) {
  if (!tokens.includes(token)) throw new Error(`Canonical premium foundation missing: ${token}`);
}

const products = fs.readFileSync("app/urunler/page.tsx", "utf8");
for (const banned of ["Yıldır güvendeyiz", "%100</strong><small>Güvenli altyapı"]) {
  if (products.includes(banned)) throw new Error(`Unverifiable trust claim remains: ${banned}`);
}

console.log("Premium public UI contract: PASS");
