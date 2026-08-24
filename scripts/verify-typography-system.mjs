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
const semanticScale = [
  ["--type-xs: 11px", "caption type token is 11px"],
  ["--type-sm: 12px", "label type token is 12px"],
  ["--type-body-sm: 14px", "small body type token is 14px"],
  ["--type-body: 16px", "body type token is 16px"],
  ["--type-body-lg: 18px", "large body type token is 18px"],
  ["--type-h4: 20px", "h4 token is 20px"],
  ["--type-h3: 24px", "h3 token is 24px"],
  ["--type-h2: clamp(28px, 3vw, 40px)", "h2 token is canonical"],
  ["--type-h1: clamp(40px, 4.8vw, 64px)", "h1 token is canonical"],
  ["--type-display: clamp(48px, 6vw, 76px)", "display token is canonical"],
  ["--type-metric: 24px", "metric token is 24px"],
];

const checks = [
  [canonicalCss.includes('@font-face { font-family:"Yenomi Inter";'), "self-hosted Inter family is registered"],
  [canonicalCss.includes('font-family:"Yenomi Inter Display"'), "display font family is registered"],
  [tokenCss.includes('--font-ui: "Yenomi Inter"'), "design-tokens owns UI font stack"],
  [tokenCss.includes('--font-display: "Yenomi Inter Display"'), "design-tokens owns display font stack"],
  [tokenCss.includes('--font-mono:'), "design-tokens owns numeric font stack"],
  ...semanticScale.map(([needle, label]) => [tokenCss.includes(needle), label]),
  [canonicalCss.includes('font-variant-numeric: tabular-nums'), "numeric typography is standardized"],
  [!undersizedType.test(readableCss), "no user-facing CSS font size is below 11px"],
  [canonicalCss.includes('body { margin: 0;') && canonicalCss.includes('font-family: var(--font-ui)'), "body consumes canonical UI font token"],
  [canonicalCss.includes('h1,h2,h3,h4 {') && canonicalCss.includes('font-family: var(--font-display)'), "headings consume canonical display font token"],
];

let failed = 0;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
