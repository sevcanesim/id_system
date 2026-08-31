import fs from "node:fs";

const canonicalCss = fs.readFileSync("app/canonical.css", "utf8");
const tokenCss = fs.readFileSync("app/design-tokens.css", "utf8");

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

const readableCss = stripDecorativeSpecimens(canonicalCss);
const undersizedType = /font-size\s*:\s*(?:[0-9](?:\.\d+)?px|10px)\b/;

// Application typography was intentionally capped at compact sidebar/panel
// proportions. Public marketing surfaces may opt into larger display type in
// their owned canonical modules; the semantic application tokens stay compact.
const semanticScale = [
  ["--type-xs: 10px", "caption application token is 10px"],
  ["--type-sm: 11px", "label application token is 11px"],
  ["--type-body-sm: 12px", "small body application token is 12px"],
  ["--type-body: 13px", "body application token is 13px"],
  ["--type-body-lg: 14px", "large body application token is 14px"],
  ["--type-h4: 15px", "h4 application token is 15px"],
  ["--type-h3: 17px", "h3 application token is 17px"],
  ["--type-h2: 20px", "h2 application token is 20px"],
  ["--type-h1: 24px", "h1 application token is 24px"],
  ["--type-display: 28px", "display application token is 28px"],
  ["--type-metric: 18px", "metric application token is 18px"],
];

const checks = [
  [canonicalCss.includes('@font-face { font-family:"Yenomi Inter";'), "self-hosted Inter family is registered"],
  [canonicalCss.includes('font-family:"Yenomi Inter Display"'), "display font family is registered"],
  [tokenCss.includes('--font-ui: "Yenomi Inter"'), "design-tokens owns UI font stack"],
  [tokenCss.includes('--font-display: "Yenomi Inter Display"'), "design-tokens owns display font stack"],
  [tokenCss.includes('--font-mono:'), "design-tokens owns numeric font stack"],
  ...semanticScale.map(([needle, label]) => [tokenCss.includes(needle), label]),
  [canonicalCss.includes('font-variant-numeric: tabular-nums'), "numeric typography is standardized"],
  [!undersizedType.test(readableCss), "no user-facing canonical CSS font size is below 11px outside decorative specimens"],
  [canonicalCss.includes('body { margin: 0;') && canonicalCss.includes('font-family: var(--font-ui)'), "body consumes canonical UI font token"],
  [canonicalCss.includes('h1,h2,h3,h4 {') && canonicalCss.includes('font-family: var(--font-display)'), "headings consume canonical display font token"],
];

let failed = 0;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
