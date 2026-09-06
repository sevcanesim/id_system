import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed++; console.log(`FAIL  ${m}`); };
const check = (ok, m) => ok ? pass(m) : fail(m);
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const required = [
  "app/canonical.css",
  "app/urunler/nfc-kart/page.tsx",
  "app/urunler/nfc-kart/layout.tsx",
  "app/sepet/page.tsx",
  "app/checkout/page.tsx",
  "app/odeme/basarili/page.tsx",
  "app/odeme/basarisiz/page.tsx",
  "app/aktivasyon/page.tsx",
  "docs/COMMERCE_EXPERIENCE_PHASE5_V25.8.45.md",
  "audit/PHASE5_COMMERCE_AUDIT.json",
];
for (const f of required) check(fs.existsSync(path.join(root, f)), `phase5 artifact exists: ${f}`);

check(!fs.existsSync(path.join(root, "app/commerce-flow.css")), "retired commerce-flow.css stays deleted");

const css = read("app/canonical.css");
const layout = read("app/layout.tsx");
const product = read("app/urunler/nfc-kart/page.tsx");
const productLayout = read("app/urunler/nfc-kart/layout.tsx");
const productPurchase = read("app/urunler/nfc-kart/NfcPurchasePanel.tsx");
const cart = read("app/sepet/page.tsx");
const checkout = read("app/checkout/page.tsx");
const success = read("app/odeme/basarili/page.tsx");
const successAction = read("app/odeme/basarili/ActivationAction.tsx");
const failedPage = read("app/odeme/basarisiz/page.tsx");
const activation = read("app/aktivasyon/page.tsx");
const activationClient = read("app/aktivasyon/ActivationClient.tsx");
const pkg = JSON.parse(read("package.json"));
const audit = JSON.parse(read("audit/PHASE5_COMMERCE_AUDIT.json"));
const phase5Doc = read("docs/COMMERCE_EXPERIENCE_PHASE5_V25.8.45.md");

check(layout.includes('import "./canonical.css"') && !layout.includes("commerce-flow.css"), "commerce chrome is owned by canonical.css, not a split commerce stylesheet");
check(fs.existsSync(path.join(root, "app/sepet/layout.tsx")) && fs.existsSync(path.join(root, "app/checkout/layout.tsx")), "commerce routes keep dedicated layouts");
check(css.includes(".nfc-product-page") && css.includes(".cart-page") && css.includes(".checkout-page"), "commerce CSS in canonical.css covers product, cart, and checkout");
check(css.includes(".activation-shell") && css.includes(".p5-result-page") && css.includes(".activation-callout"), "payment-result and activation chrome live in canonical.css");
check(css.includes("prefers-reduced-motion"), "canonical CSS supports reduced motion");
check(css.includes("@media(max-width:900px)") || css.includes("@media (max-width: 760px)"), "canonical CSS covers tablet/mobile commerce layouts");
check(audit.canonicalSurface === "app/canonical.css", "Phase 5 audit points at canonical.css");
check(phase5Doc.includes("app/canonical.css") && !phase5Doc.includes("`app/commerce-flow.css` is a canonical"), "Phase 5 doc does not keep commerce-flow.css as the live surface");

check(product.includes('className="nfc-product-page"'), "NFC product uses the live product-page scope");
check(/fiziksel NFC \+ QR kart.*güncellenebilir/i.test(productLayout), "NFC product explains physical + digital package");
check(productPurchase.includes("1 yıl") && productPurchase.includes("COMMERCIAL_FULFILLMENT.domesticShipping") && productPurchase.includes("COMMERCIAL_FULFILLMENT.handover"), "product inclusion and delivery remain explicit");
check(productPurchase.includes("AddToCartButton") && productPurchase.includes('id="nfc-hero-price-row"'), "product exposes add-to-cart purchase path");
check(!product.includes("AppFooter") && !product.includes("AppHeader"), "product flow does not remount public chrome");

check(cart.includes("cart-page") && cart.includes("p5-cart-page"), "cart keeps Phase 5 cart scope");
check(cart.includes("KDV dahil") && cart.includes("Ücretsiz"), "cart exposes tax and shipping summary");
check(cart.includes("Ödemeye geç"), "cart has one clear checkout conversion action");
check(cart.includes("yi-footer-compact"), "cart uses compact legal footer");
check(cart.includes('disabled={item.quantity <= 1}'), "cart quantity decrement is disabled at minimum quantity");

check(checkout.includes("checkout-page") && checkout.includes("p5-checkout-page"), "checkout keeps Phase 5 checkout scope");
check(checkout.includes('type PaymentProvider = "PAYTR" | null') && checkout.includes('config?.payment?.provider === "PAYTR"'), "checkout exposes a PayTR-only provider expectation");
check(checkout.includes("checkout-summary-total") && checkout.includes("checkout-summary-benefits"), "checkout retains persistent order-value summary");
check(checkout.includes("Mesafeli Satış Sözleşmesini") && checkout.includes("KVKK"), "checkout retains legal approval and privacy access");
check(checkout.includes("yi-footer-compact"), "checkout uses compact legal footer");
check(checkout.includes('fetch("/api/commerce/checkout"') && checkout.includes("x-idempotency-key"), "payment API and idempotency logic retained");

check(success.includes("p5-result-page") && success.includes("Siparişlerim") && !success.includes("/olustur?source=purchase"), "payment success header stays on orders until entitlements are ready");
check(successAction.includes("Kartvizitimi Hazırla"), "editor CTA stays entitlement-gated in the success body");
check(failedPage.includes("PaymentRetryActions"), "payment failure retains retry recovery logic");
check(activation.includes("p5-activation-page"), "legacy activation bridge retains Phase 5 visual scope");
check(activation.includes("/api/commerce/activate") || activationClient.includes("/api/commerce/activate"), "legacy activation business APIs retained");
check(activation.includes("/api/commerce/claim") || activationClient.includes("/api/commerce/claim"), "legacy activation claim API retained");

const versionMatch = String(pkg.version || "").match(/^(\d+)\.(\d+)\.(\d+)/);
const versionTuple = versionMatch ? versionMatch.slice(1).map(Number) : [0, 0, 0];
check(
  versionTuple[0] > 25 ||
    (versionTuple[0] === 25 && (versionTuple[1] > 8 || (versionTuple[1] === 8 && versionTuple[2] >= 45))),
  "package version retains Phase 5 commerce or later",
);
check(pkg.scripts?.["verify:phase5:commerce"] === "node scripts/verify-phase5-commerce.mjs", "phase5 verifier script registered");

let balance = 0;
let bad = false;
for (const ch of css) {
  if (ch === "{") balance++;
  else if (ch === "}") {
    balance--;
    if (balance < 0) bad = true;
  }
}
check(!bad && balance === 0, "CSS brace balance: app/canonical.css");

if (failed) {
  console.error(`\nPhase 5 commerce verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nPhase 5 product + commerce verification passed.");
