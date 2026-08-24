import { execFileSync } from "node:child_process";
import fs from "node:fs";

const base = process.env.DESIGN_SYSTEM_BASE || "HEAD^";
let diff = "";
try {
  diff = execFileSync("git", ["diff", "--unified=0", "--no-color", base, "HEAD", "--", "app"], { encoding: "utf8" });
} catch (error) {
  console.error(`FAIL — design-system diff could not be created from ${base}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const SOURCE_OF_TRUTH = "app/design-tokens.css";
const tokenCss = fs.readFileSync(SOURCE_OF_TRUTH, "utf8");
const LEGACY_TOKEN = /var\(--(?:gold(?:-hi|-dim)?|violet(?:-hi)?|ink(?:-[23])?|void|deep|surface-[23]|green|red|amber|blue|border-gold|glow)\b/;
const RAW_COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/i;
const RAW_DIMENSION = /(?:font-size|margin(?:-[a-z-]+)?|padding(?:-[a-z-]+)?|gap|row-gap|column-gap|border-radius|max-width|min-width|width|height)\s*:\s*[^;]*(?<![-\w])(?:[1-9]\d*|0?\.\d+)px\b/i;
const FORBIDDEN_COPY = /\b(?:retry|refresh)\b|buraya\s+tıklayın|lütfen\s+bekleyiniz|işlem\s+başarısız\s+oldu/i;
const CLICK_COPY = /(?:^|[\s"'`>])(tıkla)(?:[\s"'`<.!?]|$)/i;
const AMBIGUOUS_CTA = />\s*(?:Devam Et|Gönder|Onayla|Tamam)\s*</i;
const NONSTANDARD_LOADING = /(?:[A-Za-zÇĞİÖŞÜçğıöşü]+\s+)?yükleniyor(?:…|\.\.\.)/i;

const TOKEN_CONTRACT = new Map([
  ["--background", "#FAF9F6"],
  ["--surface", "#FFFFFF"],
  ["--surface-secondary", "#F4F1EB"],
  ["--surface-dark", "#171512"],
  ["--text-primary", "#1A1918"],
  ["--text-secondary", "#68645D"],
  ["--text-tertiary", "#6B655D"],
  ["--border", "#E9E4DA"],
  ["--border-strong", "#D8D1C5"],
  ["--primary", "#A37B2C"],
  ["--primary-hover", "#7E5E20"],
  ["--primary-active", "#8D6924"],
  ["--primary-subtle", "#F6F1E5"],
  ["--success", "#059669"],
  ["--warning", "#D97706"],
  ["--error", "#DC2626"],
  ["--radius-xs", "6px"],
  ["--radius-sm", "10px"],
  ["--radius-md", "14px"],
  ["--radius-lg", "20px"],
  ["--radius-xl", "28px"],
  ["--radius-full", "999px"],
  ["--space-1", "4px"],
  ["--space-2", "8px"],
  ["--space-3", "12px"],
  ["--space-4", "16px"],
  ["--space-5", "20px"],
  ["--space-6", "24px"],
  ["--space-8", "32px"],
  ["--space-10", "40px"],
  ["--space-12", "48px"],
  ["--space-16", "64px"],
  ["--space-20", "80px"],
  ["--space-24", "96px"],
  ["--space-30", "120px"],
  ["--type-xs", "11px"],
  ["--type-sm", "12px"],
  ["--type-body-sm", "14px"],
  ["--type-body", "16px"],
  ["--type-body-lg", "18px"],
  ["--type-h4", "20px"],
  ["--type-h3", "24px"],
  ["--type-h2", "clamp(28px, 3vw, 40px)"],
  ["--type-h1", "clamp(40px, 4.8vw, 64px)"],
  ["--type-display", "clamp(48px, 6vw, 76px)"],
  ["--type-metric", "24px"],
  ["--control-height-sm", "36px"],
  ["--control-height-md", "44px"],
  ["--control-height-lg", "52px"],
  ["--motion-fast", "140ms"],
  ["--motion-standard", "220ms"],
  ["--motion-emphasis", "380ms"],
  ["--content", "1180px"],
  ["--wide", "1320px"],
]);

const failures = [];

for (const [token, expected] of TOKEN_CONTRACT) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tokenCss.match(new RegExp(`${escaped}\\s*:\\s*([^;]+);`));
  const actual = match?.[1]?.trim();
  if (actual !== expected) failures.push(`${SOURCE_OF_TRUTH} ${token} must be '${expected}', found '${actual ?? "missing"}'`);
}

let currentFile = "";
let newLine = 0;
for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) {
    currentFile = line.slice(6);
    newLine = 0;
    continue;
  }
  const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (hunk) {
    newLine = Number(hunk[1]);
    continue;
  }
  if (!currentFile || line.startsWith("---") || line.startsWith("diff ")) continue;

  if (line.startsWith("+")) {
    const added = line.slice(1);
    const location = `${currentFile}:${newLine}`;
    const isTokenSource = currentFile === SOURCE_OF_TRUTH;
    const isCss = currentFile.endsWith(".css");
    const isUiSource = /\.(?:css|tsx|ts)$/.test(currentFile);

    if (isUiSource && !isTokenSource && LEGACY_TOKEN.test(added)) {
      failures.push(`${location} legacy color token used; consume semantic design tokens instead`);
    }
    if (isUiSource && !isTokenSource && RAW_COLOR.test(added)) {
      failures.push(`${location} raw color literal added outside design-tokens.css`);
    }
    if (isCss && !isTokenSource && RAW_DIMENSION.test(added)) {
      failures.push(`${location} raw px dimension added; use the canonical type/space/radius/layout/control token`);
    }
    if (/\.(?:tsx|ts)$/.test(currentFile) && (FORBIDDEN_COPY.test(added) || CLICK_COPY.test(added) || AMBIGUOUS_CTA.test(added))) {
      failures.push(`${location} forbidden, ambiguous or non-premium micro-copy added`);
    }
    if (/\.(?:tsx|ts)$/.test(currentFile) && NONSTANDARD_LOADING.test(added) && !/["'`]Yükleniyor\.\.\.["'`]/.test(added)) {
      failures.push(`${location} loading copy must use '[Nesne] yükleniyor.' or the generic 'Yükleniyor...' spinner exception`);
    }
    newLine += 1;
    continue;
  }

  if (!line.startsWith("-")) newLine += 1;
}

const changedPages = [...diff.matchAll(/^\+\+\+ b\/(app\/.*\/page\.tsx|app\/page\.tsx)$/gm)].map((match) => match[1]);
for (const page of new Set(changedPages)) {
  if (!fs.existsSync(page)) continue;
  const source = fs.readFileSync(page, "utf8");
  const h1Count = (source.match(/<h1\b/g) || []).length;
  if (h1Count > 1) failures.push(`${page} contains ${h1Count} H1 elements; page contract allows at most one local H1`);
}

if (failures.length) {
  console.error("Design System Standard violations:\n");
  for (const failure of failures) console.error(`FAIL — ${failure}`);
  process.exit(1);
}

console.log("PASS — semantic token contract is intact");
console.log("PASS — changed UI lines respect the Yenomi ID Design System Standard");
