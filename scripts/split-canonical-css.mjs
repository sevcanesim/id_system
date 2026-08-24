import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "app/canonical.css");
const outDir = path.join(root, "app/styles");
const APPLY = process.argv.includes("--apply");
const DOMAIN = process.argv.find((arg) => arg.startsWith("--domain="))?.split("=")[1] ?? "support-legal";

const targets = {
  "support-legal": { file: "canonical-public.css", prefixes: ["support-", "legal-"] },
  "public-marketing": { file: "canonical-public.css", prefixes: ["home-", "p4-"] },
  "products": { file: "canonical-products.css", prefixes: ["products-", "nfc-", "how-"] },
  "corporate": { file: "canonical-corporate.css", prefixes: ["corporate-", "corp-", "p10-", "p11-", "enterprise-", "business-"] },
  "account": { file: "canonical-account.css", prefixes: ["p6-", "p7-", "p8-", "p9-", "p12-"] },
  "commerce": { file: "canonical-commerce.css", prefixes: ["checkout-", "cart-", "order-", "payment-", "commerce-"] },
};

const target = targets[DOMAIN];
if (!target) {
  console.error(`Unknown domain '${DOMAIN}'. Allowed: ${Object.keys(targets).join(", ")}`);
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, "utf8");

function splitTopLevelBlocks(css) {
  const blocks = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  let comment = false;
  let escaped = false;

  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    const next = css[i + 1];
    if (comment) {
      if (ch === "*" && next === "/") { comment = false; i += 1; }
      continue;
    }
    if (!quote && ch === "/" && next === "*") { comment = true; i += 1; continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) { blocks.push(css.slice(start, i + 1)); start = i + 1; }
    } else if (ch === ";" && depth === 0) {
      blocks.push(css.slice(start, i + 1));
      start = i + 1;
    }
  }

  if (css.slice(start).trim()) blocks.push(css.slice(start));
  if (depth !== 0 || quote || comment) throw new Error("canonical.css could not be parsed safely: unbalanced structure");
  return blocks;
}

function classNames(block) {
  return [...block.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((match) => match[1]);
}

function belongsEntirelyToTarget(block) {
  const classes = classNames(block);
  if (!classes.length) return false;
  return classes.every((className) => target.prefixes.some((prefix) => className.startsWith(prefix)));
}

function isIgnorable(block) {
  return block.trim() === "" || /^\s*\/\*[\s\S]*\*\/\s*$/.test(block);
}

const blocks = splitTopLevelBlocks(source);
const targetIndexes = blocks.flatMap((block, index) => belongsEntirelyToTarget(block) ? [index] : []);
const firstTarget = targetIndexes.at(0) ?? -1;
const lastTarget = targetIndexes.at(-1) ?? -1;
const contiguous = targetIndexes.length > 0 && targetIndexes.every((index, offset) => index === firstTarget + offset);
const nonIgnorableAfterTarget = lastTarget >= 0
  ? blocks.slice(lastTarget + 1).some((block) => !isIgnorable(block))
  : false;
const isSafeSuffix = contiguous && !nonIgnorableAfterTarget;

const extracted = isSafeSuffix ? blocks.slice(firstTarget) : [];
const retained = isSafeSuffix ? blocks.slice(0, firstTarget) : blocks;
const extractedCss = extracted.join("").trim();
const retainedCss = retained.join("").trimEnd() + "\n";
const existingModulePath = path.join(outDir, target.file);
const existingModule = fs.existsSync(existingModulePath) ? fs.readFileSync(existingModulePath, "utf8").trimEnd() : "";

const report = {
  domain: DOMAIN,
  prefixes: target.prefixes,
  sourceBytesBefore: Buffer.byteLength(source),
  sourceLinesBefore: source.split("\n").length,
  totalTopLevelBlocks: blocks.length,
  matchingBlocks: targetIndexes.length,
  firstMatchingBlock: firstTarget,
  lastMatchingBlock: lastTarget,
  matchingBlocksContiguous: contiguous,
  safeSuffix: isSafeSuffix,
  nonIgnorableBlocksAfterMatch: nonIgnorableAfterTarget,
  extractableBytes: Buffer.byteLength(extractedCss),
  extractableLines: extractedCss ? extractedCss.split("\n").length : 0,
  destination: `app/styles/${target.file}`,
};

console.log(JSON.stringify(report, null, 2));

if (!isSafeSuffix) {
  console.log("NOT SAFE TO MOVE — matching rules are not a contiguous suffix of canonical.css. No files changed.");
  process.exit(APPLY ? 1 : 0);
}

if (!APPLY) {
  console.log(`DRY RUN — cascade-safe suffix found. To apply: node scripts/split-canonical-css.mjs --domain=${DOMAIN} --apply`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const moduleHeader = "/* Extracted from the tail of app/canonical.css. Cascade order is preserved by importing this file immediately after canonical.css. */";
const nextModule = [existingModule || moduleHeader, extractedCss].filter(Boolean).join("\n\n") + "\n";
fs.writeFileSync(existingModulePath, nextModule);
fs.writeFileSync(sourcePath, retainedCss);
console.log(`APPLIED — moved ${extracted.length} tail blocks for ${DOMAIN} to app/styles/${target.file}.`);
console.log("REQUIRED — import the module immediately after canonical.css in app/layout.tsx, then run all UI/build/E2E gates before committing.");
