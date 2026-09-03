import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const check = (condition, message) => {
  if (condition) console.log(`PASS  ${message}`);
  else { failed += 1; console.log(`FAIL  ${message}`); }
};

const commercial = read("lib/config/commercial.ts");
const product = read("lib/config/product.ts");
const cart = read("lib/cart.ts");
const productPage = read("app/urunler/nfc-kart/page.tsx");
const purchasePanel = read("app/urunler/nfc-kart/NfcPurchasePanel.tsx");
const legacyOrder = read("app/nfc-siparis/page.tsx");
const checkoutPage = read("app/checkout/page.tsx");
const checkoutApi = read("app/api/commerce/checkout/route.ts");
const architectureAudit = read("audit/PHASE1_PRODUCT_ARCHITECTURE_AUDIT.md");

check(commercial.includes("export const COMMERCIAL_SKUS"), "commercial SKU dictionary is canonical");
check(product.includes("defaultOfferSku?: string") && product.includes("defaultOfferSku: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.sku"), "catalog product explicitly points to its Premium-first default sellable offer");
check(
  (purchasePanel.includes("product.defaultOfferSku") && purchasePanel.includes("COMMERCIAL_SKUS.PREMIUM") && purchasePanel.includes("variantSku={offerSku}"))
  || purchasePanel.includes("variantSku={product.defaultOfferSku}")
  || productPage.includes("variantSku={NFC_PRODUCT.defaultOfferSku}"),
  "canonical NFC product purchase sends an explicit offer SKU (NFC default, Premium optional)",
);
check(legacyOrder.includes("variantSku: NFC_PRODUCT.defaultOfferSku"), "legacy NFC order bridge also sends explicit initial offer SKU");
check(cart.includes("legacyInitialOffer") && cart.includes("COMMERCIAL_SKUS.INITIAL"), "legacy carts without variant SKU migrate deterministically to initial offer");
check(checkoutApi.includes("variantSku: z.string().min(2).max(100),") && !checkoutApi.includes("variantSku: z.string().min(2).max(100).optional()"), "checkout API requires an explicit offer SKU");
check(checkoutApi.includes("row.is_active && row.sku === item.variantSku") && !checkoutApi.includes("!item.variantSku ||"), "checkout never selects the first arbitrary active variant");
check(checkoutApi.includes("Number(variant.price_kurus)"), "checkout price remains server-authoritative from DB variant");
check(checkoutApi.includes("isDigitalOnlySku") && checkoutApi.includes("digitalServiceBillingAddress"), "digital-only checkout billing address is server-authoritative");
check(checkoutPage.includes("COMMERCIAL_SKUS") && checkoutPage.includes("isPhysicalBundleSku") && checkoutPage.includes("isDigitalOnlySku"), "checkout UI uses canonical SKU helpers instead of duplicated literals");
check(checkoutPage.includes("digitalServiceBillingAddress") && checkoutPage.includes("Fatura ili ve ilçesini doğrula"), "digital-only checkout does not demand a physical street address");
check(architectureAudit.includes("Legacy candidates — do not delete yet") && architectureAudit.includes("/nfc-siparis"), "legacy /nfc-siparis remains retained until usage/backward-compatibility evidence exists");
check(cart.includes('const LEGACY_KEY = "yenomi-cart-v1"') && cart.includes("They are only claimed once we know the authenticated user id"), "legacy cart compatibility remains privacy-scoped and intentional");

const skuLiterals = [
  "YENOMI-NFC-CARD-ANNUAL",
  "YENOMI-DIGITAL-ANNUAL",
  "YENOMI-DIGITAL-RENEWAL-ANNUAL",
  "YENOMI-NFC-EXTRA",
  "YENOMI-NFC-REPLACEMENT",
  "YENOMI-NFC-PREMIUM-ANNUAL",
  "YENOMI-PREMIUM-RENEWAL-ANNUAL",
  "YENOMI-PREMIUM-UPGRADE",
];
const sourceFiles = [];
for (const base of ["app", "lib"]) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
    }
  };
  walk(path.join(root, base));
}
const offending = [];
for (const file of sourceFiles) {
  const rel = path.relative(root, file);
  if (rel === "lib/config/commercial.ts") continue;
  const src = fs.readFileSync(file, "utf8");
  for (const sku of skuLiterals) if (src.includes(`"${sku}"`) || src.includes(`'${sku}'`)) offending.push(`${rel}: ${sku}`);
}
check(offending.length === 0, `canonical individual offer SKU literals are centralized${offending.length ? ` (${offending.join(", ")})` : ""}`);

if (failed) {
  console.error(`\nFAZ 2 commerce consistency verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nFAZ 2 commerce consistency verification passed.");
