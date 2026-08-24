import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "app/canonical.css");
const outDir = path.join(root, "app/styles");
const APPLY = process.argv.includes("--apply");
const DOMAIN = process.argv.find((arg) => arg.startsWith("--domain="))?.split("=")[1] ?? "support-legal";

const targets = {
  "support-legal": {
    name: "support-legal",
    file: "canonical-public.css",
    prefixes: ["support-", "legal-"],
  },
  "public-marketing": {
    name: "public-marketing",
    file: "canonical-public.css",
    prefixes: ["home-", "p4-"],
  },
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
      if (depth === 0) {
        blocks.push(css.slice(start, i + 1));
        start = i + 1;
      }
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

const blocks = splitTopLevelBlocks(source);
const extracted = [];
const retained = [];

for (const block of blocks) {
  if (belongsEntirelyToTarget(block)) extracted.push(block);
  else retained.push(block);
}

const extractedCss = extracted.join("").trim();
const retainedCss = retained.join("").trimStart();
const existingModulePath = path.join(outDir, target.file);
const existingModule = fs.existsSync(existingModulePath) ? fs.readFileSync(existingModulePath, "utf8").trimEnd() : "";

const report = {
  domain: DOMAIN,
  prefixes: target.prefixes,
  sourceBytesBefore: Buffer.byteLength(source),
  sourceLinesBefore: source.split("\n").length,
  totalTopLevelBlocks: blocks.length,
  extractedBlocks: extracted.length,
  extractedBytes: Buffer.byteLength(extractedCss),
  extractedLines: extractedCss ? extractedCss.split("\n").length : 0,
  sourceBytesAfter: Buffer.byteLength(retainedCss),
  sourceLinesAfter: retainedCss.split("\n").length,
  destination: `app/styles/${target.file}`,
};

console.log(JSON.stringify(report, null, 2));

if (!extracted.length) {
  console.error(`No safely isolated ${DOMAIN} blocks found; nothing to apply.`);
  process.exit(APPLY ? 1 : 0);
}

if (!APPLY) {
  console.log(`DRY RUN — no files changed. Review the report, then run: node scripts/split-canonical-css.mjs --domain=${DOMAIN} --apply`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const moduleHeader = "/* Canonical public module. Preserve extraction order; no selector rewrites. */";
const nextModule = [existingModule || moduleHeader, extractedCss].filter(Boolean).join("\n\n") + "\n";
fs.writeFileSync(existingModulePath, nextModule);
fs.writeFileSync(sourcePath, retainedCss);

console.log(`APPLIED — moved ${extracted.length} isolated ${DOMAIN} blocks to app/styles/${target.file}.`);
console.log("NEXT — import the module in app/layout.tsx at the exact intended cascade position, then run UI/build/E2E gates before committing.");
