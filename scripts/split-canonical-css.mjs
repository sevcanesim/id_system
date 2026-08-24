import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "app/canonical.css");
const outDir = path.join(root, "app/styles");
const APPLY = process.argv.includes("--apply");
const requestedDomain = process.argv.find((arg) => arg.startsWith("--domain="))?.split("=")[1] ?? "auto";

const targets = {
  "support-legal": { file: "canonical-public.css", prefixes: ["support-", "legal-"] },
  "public-marketing": { file: "canonical-public.css", prefixes: ["home-", "p4-"] },
  products: { file: "canonical-products.css", prefixes: ["products-", "nfc-", "how-"] },
  corporate: { file: "canonical-corporate.css", prefixes: ["corporate-", "corp-", "p10-", "p11-", "enterprise-", "business-"] },
  account: { file: "canonical-account.css", prefixes: ["p6-", "p7-", "p8-", "p9-", "p12-"] },
  commerce: { file: "canonical-commerce.css", prefixes: ["checkout-", "cart-", "order-", "payment-", "commerce-"] },
};

if (requestedDomain !== "auto" && !targets[requestedDomain]) {
  console.error(`Unknown domain '${requestedDomain}'. Allowed: auto, ${Object.keys(targets).join(", ")}`);
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

function isIgnorable(block) {
  return block.trim() === "" || /^\s*\/\*[\s\S]*\*\/\s*$/.test(block);
}

const blocks = splitTopLevelBlocks(source);

function inspectDomain(name) {
  const target = targets[name];
  const belongs = (block) => {
    const classes = classNames(block);
    if (!classes.length) return false;
    return classes.every((className) => target.prefixes.some((prefix) => className.startsWith(prefix)));
  };
  const indexes = blocks.flatMap((block, index) => belongs(block) ? [index] : []);
  const first = indexes.at(0) ?? -1;
  const last = indexes.at(-1) ?? -1;
  const contiguous = indexes.length > 0 && indexes.every((index, offset) => index === first + offset);
  const nonIgnorableAfter = last >= 0 ? blocks.slice(last + 1).some((block) => !isIgnorable(block)) : false;
  const safeSuffix = contiguous && !nonIgnorableAfter;
  const extracted = safeSuffix ? blocks.slice(first) : [];
  const css = extracted.join("").trim();
  return {
    name,
    target,
    indexes,
    first,
    last,
    contiguous,
    nonIgnorableAfter,
    safeSuffix,
    extracted,
    extractedCss: css,
    extractableBytes: Buffer.byteLength(css),
    extractableLines: css ? css.split("\n").length : 0,
  };
}

const inspections = Object.keys(targets).map(inspectDomain);

if (requestedDomain === "auto") {
  console.log(JSON.stringify({
    sourceBytes: Buffer.byteLength(source),
    sourceLines: source.split("\n").length,
    totalTopLevelBlocks: blocks.length,
    domains: inspections.map((item) => ({
      domain: item.name,
      prefixes: item.target.prefixes,
      matchingBlocks: item.indexes.length,
      firstMatchingBlock: item.first,
      lastMatchingBlock: item.last,
      matchingBlocksContiguous: item.contiguous,
      safeSuffix: item.safeSuffix,
      extractableBytes: item.extractableBytes,
      extractableLines: item.extractableLines,
      destination: `app/styles/${item.target.file}`,
    })),
  }, null, 2));
  const safe = inspections.filter((item) => item.safeSuffix);
  if (safe.length === 1) {
    console.log(`SAFE DOMAIN — ${safe[0].name}`);
    console.log(`NEXT — node scripts/split-canonical-css.mjs --domain=${safe[0].name} --apply`);
  } else if (safe.length === 0) {
    console.log("NO SAFE DOMAIN — no approved domain currently forms a contiguous tail suffix. Do not move CSS yet.");
  } else {
    console.log(`AMBIGUOUS — multiple safe domains detected: ${safe.map((item) => item.name).join(", ")}. Review before applying.`);
  }
  if (APPLY) {
    console.error("--apply cannot be used with --domain=auto. Choose the reported safe domain explicitly.");
    process.exit(1);
  }
  process.exit(0);
}

const inspection = inspections.find((item) => item.name === requestedDomain);
const { target, safeSuffix, extracted, extractedCss, first, last, contiguous, nonIgnorableAfter } = inspection;
const retainedCss = safeSuffix ? blocks.slice(0, first).join("").trimEnd() + "\n" : source;
const existingModulePath = path.join(outDir, target.file);
const existingModule = fs.existsSync(existingModulePath) ? fs.readFileSync(existingModulePath, "utf8").trimEnd() : "";

console.log(JSON.stringify({
  domain: requestedDomain,
  prefixes: target.prefixes,
  sourceBytesBefore: Buffer.byteLength(source),
  sourceLinesBefore: source.split("\n").length,
  totalTopLevelBlocks: blocks.length,
  matchingBlocks: inspection.indexes.length,
  firstMatchingBlock: first,
  lastMatchingBlock: last,
  matchingBlocksContiguous: contiguous,
  safeSuffix,
  nonIgnorableBlocksAfterMatch: nonIgnorableAfter,
  extractableBytes: inspection.extractableBytes,
  extractableLines: inspection.extractableLines,
  destination: `app/styles/${target.file}`,
}, null, 2));

if (!safeSuffix) {
  console.log("NOT SAFE TO MOVE — matching rules are not a contiguous suffix of canonical.css. No files changed.");
  process.exit(APPLY ? 1 : 0);
}

if (!APPLY) {
  console.log(`DRY RUN — cascade-safe suffix found. To apply: node scripts/split-canonical-css.mjs --domain=${requestedDomain} --apply`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const moduleHeader = "/* Extracted from the tail of app/canonical.css. Cascade order is preserved by importing this file immediately after canonical.css. */";
const nextModule = [existingModule || moduleHeader, extractedCss].filter(Boolean).join("\n\n") + "\n";
fs.writeFileSync(existingModulePath, nextModule);
fs.writeFileSync(sourcePath, retainedCss);
console.log(`APPLIED — moved ${extracted.length} tail blocks for ${requestedDomain} to app/styles/${target.file}.`);
console.log("REQUIRED — import the module immediately after canonical.css in app/layout.tsx, then run all UI/build/E2E gates before committing.");
