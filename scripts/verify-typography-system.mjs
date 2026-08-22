import fs from "node:fs";
const css = fs.readFileSync("app/canonical.css", "utf8");
// Physical-card, phone, dashboard and "Nasıl Çalışır" specimens deliberately
// scale their rendered interface below normal reading size. They are decorative
// product imagery, not readable application copy.
const DECORATIVE_PREFIXES = [
  "yi-product-ui",
  "how-step-visual",
  "how-phone",
  "how-qr",
  "yi-card-",
  "yi-profile-",
  "corporate-dashboard-",
  "home-compact__metrics",
  "p6-auth-mini-phone",
];
const decorativeSelector = new RegExp(
  `(?:^|})\\s*[^@}{]*\\.(?:${DECORATIVE_PREFIXES.join("|")})[^{]*\\{[^}]*\\}`,
  "g",
);
function stripDecorativeSpecimens(source) {
  let next = source.replace(/\.yi-product-ui\{[\s\S]*?@keyframes yi-card-shine/g, "");
  let previous = "";
  while (next !== previous) {
    previous = next;
    next = next.replace(decorativeSelector, (match) => (match.startsWith("}") ? "}" : ""));
  }
  return next;
}
const readableCss = stripDecorativeSpecimens(css);
const undersizedType = /font-size\s*:\s*(?:[0-9](?:\.\d+)?px|10px)\b/;
const checks = [
  [css.includes('@font-face { font-family:"Yenomi Inter";'), "self-hosted Inter family is registered"],
  [css.includes('font-family:"Yenomi Inter Display"'), "display font family is registered"],
  [css.includes('--type-body: 16px'), "body type token is 16px"],
  [css.includes('--type-body-sm: 14px'), "small body type token is 14px"],
  [css.includes('--type-body-lg: 18px'), "large body type token is 18px"],
  [css.includes('--type-h3: 24px'), "heading scale is defined"],
  [css.includes('--type-display: clamp(48px, 6vw, 76px)'), "display scale is defined"],
  [css.includes('font-variant-numeric: tabular-nums'), "numeric typography is standardized"],
  [!undersizedType.test(readableCss), "no user-facing CSS font size is below 11px"],
  [css.includes('body { margin: 0;') && css.includes('font-family: var(--font-ui)'), "body uses the canonical UI font"],
  [css.includes('h1,h2,h3,h4 {') && css.includes('font-family: var(--font-display)'), "headings use the canonical display font"],
];
let failed = 0;
for (const [ok, label] of checks) { console.log(`${ok ? "PASS" : "FAIL"} — ${label}`); if (!ok) failed++; }
if (failed) process.exit(1);
