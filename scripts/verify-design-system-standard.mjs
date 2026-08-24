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
const LEGACY_TOKEN = /var\(--(?:gold(?:-hi|-dim)?|violet(?:-hi)?|ink(?:-[23])?|void|deep|surface-[23]|green|red|amber|blue|border-gold|glow)\b/;
const RAW_COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/i;
const RAW_DIMENSION = /(?:font-size|margin(?:-[a-z-]+)?|padding(?:-[a-z-]+)?|gap|row-gap|column-gap|border-radius|max-width|min-width|width|height)\s*:\s*[^;]*(?<![-\w])(?:[1-9]\d*|0?\.\d+)px\b/i;
const FORBIDDEN_COPY = /\b(?:retry|refresh)\b|buraya\s+tıklayın|lütfen\s+bekleyiniz|işlem\s+başarısız\s+oldu/i;
const CLICK_COPY = /(?:^|[\s"'`>])(tıkla)(?:[\s"'`<.!?]|$)/i;
const NONSTANDARD_LOADING = /(?:[A-Za-zÇĞİÖŞÜçğıöşü]+\s+)?yükleniyor(?:…|\.\.\.)/i;

const failures = [];
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
    if (/\.(?:tsx|ts)$/.test(currentFile) && (FORBIDDEN_COPY.test(added) || CLICK_COPY.test(added))) {
      failures.push(`${location} forbidden or non-premium micro-copy added`);
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

console.log("PASS — changed UI lines respect the Yenomi ID Design System Standard");
