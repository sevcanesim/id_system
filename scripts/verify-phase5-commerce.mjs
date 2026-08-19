import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed++; console.log(`FAIL  ${m}`); };
const check = (ok,m) => ok ? pass(m) : fail(m);
const read = (f) => fs.readFileSync(path.join(root,f),"utf8");

const required = [
  "app/commerce-flow.css",
  "app/urunler/nfc-kart/page.tsx",
  "app/sepet/page.tsx",
  "app/checkout/page.tsx",
  "app/odeme/basarili/page.tsx",
  "app/odeme/basarisiz/page.tsx",
  "app/aktivasyon/page.tsx",
  "docs/COMMERCE_EXPERIENCE_PHASE5_V25.8.45.md",
  "audit/PHASE5_COMMERCE_AUDIT.json"
];
for (const f of required) check(fs.existsSync(path.join(root,f)), `phase5 artifact exists: ${f}`);

const css = read("app/commerce-flow.css");
const layout = read("app/layout.tsx");
const product = read("app/urunler/nfc-kart/page.tsx");
const cart = read("app/sepet/page.tsx");
const checkout = read("app/checkout/page.tsx");
const success = read("app/odeme/basarili/page.tsx");
const failedPage = read("app/odeme/basarisiz/page.tsx");
const activation = read("app/aktivasyon/page.tsx");
const activationClient = read("app/aktivasyon/ActivationClient.tsx");
const pkg = JSON.parse(read("package.json"));

check(fs.existsSync(path.join(root, "app/sepet/layout.tsx")) && fs.existsSync(path.join(root, "app/checkout/layout.tsx")), "commerce flow stylesheet remains route-owned by commerce layouts");
check(css.includes(".p5-product-page") && css.includes(".p5-cart-page") && css.includes(".p5-checkout-page"), "commerce CSS explicitly scoped to Phase 5 surfaces");
check(!/--(?:yi|yp|store|brand|ui|y)-/.test(css), "Phase 5 CSS introduces no legacy token family");
check(!/linear-gradient|radial-gradient|conic-gradient/.test(css), "Phase 5 commerce chrome uses no gradients");
check(!/backdrop-filter\s*:(?!none)/.test(css), "Phase 5 commerce chrome uses no active glass blur");
check(css.includes("prefers-reduced-motion"), "Phase 5 supports reduced motion");
check(css.includes("@media(max-width:900px)") && css.includes("@media(max-width:640px)"), "Phase 5 covers tablet and mobile commerce layouts");

check(product.includes('className="nfc-product-page p5-product-page"'), "NFC product migrated to Phase 5 scope");
check(/fiziksel kart.*güncellenebilir dijital kimlik/i.test(product), "NFC product explains physical + digital package");
check(product.includes("1 yıllık dijital profil kullanımı") && product.includes("Türkiye içi kargo dahil"), "product inclusion and delivery remain explicit");
check(product.includes("Hemen Satın Al") && product.includes('destination="/checkout"'), "product exposes direct purchase path");
check(cart.includes('disabled={item.quantity <= 1}'), "cart quantity decrement is disabled at minimum quantity");
check(/AppFooter[\s\S]*variant="compact"/.test(product) || product.includes("yi-footer-compact"), "product flow uses compact legal footer");

check(cart.includes('className="cart-page p5-cart-page"'), "cart migrated to Phase 5 scope");
check(cart.includes("KDV dahil") && cart.includes("Ücretsiz"), "cart exposes tax and shipping summary");
check(cart.includes("Güvenli Satın Almaya Geç"), "cart has one clear checkout conversion action");
check(/AppFooter[\s\S]*variant="compact"/.test(cart) || cart.includes("yi-footer-compact"), "cart uses compact legal footer");

check(checkout.includes('className="checkout-page p5-checkout-page"'), "checkout migrated to Phase 5 scope");
check(checkout.includes("iyzico güvenli ödeme sayfasına geçeceksin"), "checkout sets concrete provider expectation");
check(checkout.includes("checkout-summary-total") && checkout.includes("checkout-summary-benefits"), "checkout retains persistent order-value summary");
check(checkout.includes("Mesafeli Satış Sözleşmesini") && checkout.includes("KVKK"), "checkout retains legal approval and privacy access");
check(/AppFooter[\s\S]*variant="compact"/.test(checkout) || checkout.includes("yi-footer-compact"), "checkout uses minimal legal footer");
check(checkout.includes('fetch("/api/commerce/checkout"') && checkout.includes("x-idempotency-key"), "payment API and idempotency logic retained");

check(success.includes("p5-result-page") && success.includes("Kartvizitimi Hazırla") && success.includes("Siparişlerim"), "payment success exposes next-step actions");
check(failedPage.includes("PaymentRetryActions"), "payment failure retains retry recovery logic");
check(activation.includes('p5-activation-page'), "legacy activation bridge retains Phase 5 visual scope");
check(activation.includes('/api/commerce/activate') || activationClient.includes('/api/commerce/activate'), "legacy activation business APIs retained");
check(activation.includes('/api/commerce/claim') || activationClient.includes('/api/commerce/claim'), "legacy activation claim API retained");

const versionMatch = String(pkg.version || "").match(/^(\d+)\.(\d+)\.(\d+)/);
const versionTuple = versionMatch ? versionMatch.slice(1).map(Number) : [0, 0, 0];
check(
  versionTuple[0] > 25 ||
    (versionTuple[0] === 25 && (versionTuple[1] > 8 || (versionTuple[1] === 8 && versionTuple[2] >= 45))),
  "package version retains Phase 5 commerce or later",
);
check(pkg.scripts?.["verify:phase5:commerce"] === "node scripts/verify-phase5-commerce.mjs", "phase5 verifier script registered");

let balance=0,bad=false;
for (const ch of css) { if(ch==="{") balance++; else if(ch==="}"){ balance--; if(balance<0) bad=true; } }
check(!bad && balance===0, "CSS brace balance: app/commerce-flow.css");

if (failed) { console.error(`\nPhase 5 commerce verification failed (${failed}).`); process.exit(1); }
console.log("\nPhase 5 product + commerce verification passed.");
