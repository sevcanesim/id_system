import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "app/canonical.css");
const outDir = path.join(root, "app/styles");
const APPLY = process.argv.includes("--apply");

const domains = [
  { name: "public", file: "canonical-public.css", prefixes: ["home-", "p4-", "support-", "legal-"] },
  { name: "products", file: "canonical-products.css", prefixes: ["products-", "nfc-", "how-"] },
  { name: "corporate", file: "canonical-corporate.css", prefixes: ["corporate-", "corp-", "p10-", "p11-", "enterprise-", "business-"] },
  { name: "account", file: "canonical-account.css", prefixes: ["p6-", "p7-", "p8-", "p9-", "p12-"] },
  { name: "commerce", file: "canonical-commerce.css", prefixes: ["checkout-", "cart-", "order-", "payment-", "commerce-"] },
];

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

  if (source.slice(start).trim()) blocks.push(css.slice(start));
  if (depth !== 0 || quote || comment) throw new Error("canonical.css could not be parsed safely: unbalanced structure");
  return blocks;
}

function classNames(block) {
  return [...block.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

function classify(block) {
  const classes = classNames(block);
  if (!classes.length) return null;
  const matches = new Set();
  for (const cls of classes) {
    for (const domain of domains) {
      if (domain.prefixes.some((prefix) => cls.startsWith(prefix))) matches.add(domain.name);
    }
  }
  if (matches.size !== 1) return null;
  const [name] = [...matches];
  // Only move a block when every class selector belongs to the same domain.
  const domain = domains.find((item) => item.name === name);
  if (!classes.every((cls) => domain.prefixes.some((prefix) => cls.startsWith(prefix)))) return null;
  return name;
}

const blocks = splitTopLevelBlocks(source);
const buckets = new Map(domains.map((domain) => [domain.name, []]));
const retained = [];

for (const block of blocks) {
  const domain = classify(block);
  if (domain) buckets.get(domain).push(block);
  else retained.push(block);
}

const report = {
  sourceBytes: Buffer.byteLength(source),
  sourceLines: source.split("\n").length,
  totalTopLevelBlocks: blocks.length,
  retainedBlocks: retained.length,
  modules: Object.fromEntries(domains.map((domain) => {
    const css = buckets.get(domain.name).join("");
    return [domain.name, {
      blocks: buckets.get(domain.name).length,
      bytes: Buffer.byteLength(css),
      lines: css ? css.split("\n").length : 0,
      file: `app/styles/${domain.file}`,
    }];
  })),
};

console.log(JSON.stringify(report, null, 2));

if (!APPLY) {
  console.log("DRY RUN — no files changed. Run with --apply only after reviewing the report.");
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
for (const domain of domains) {
  const css = buckets.get(domain.name).join("").trim();
  if (!css) continue;
  fs.writeFileSync(path.join(outDir, domain.file), `/* Extracted from app/canonical.css without selector rewrites. */\n${css}\n`);
}
fs.writeFileSync(sourcePath, retained.join("").trimStart());
console.log("APPLIED — canonical.css and canonical domain modules were rewritten. Run all UI/build/E2E gates before committing.");
