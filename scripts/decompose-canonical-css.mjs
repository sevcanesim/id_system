import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonicalPath = path.join(root, "app/canonical.css");
const sourceDir = path.join(root, "app/styles/canonical-source");
const manifestPath = path.join(sourceDir, "manifest.json");
const mode = process.argv[2] ?? "--audit";

const domains = [
  { name: "public", prefixes: ["home-", "p4-", "support-", "legal-"] },
  { name: "products", prefixes: ["products-", "nfc-", "how-"] },
  { name: "corporate", prefixes: ["corporate-", "corp-", "p10-", "p11-", "enterprise-", "business-"] },
  { name: "account", prefixes: ["p6-", "p7-", "p8-", "p9-", "p12-"] },
  { name: "commerce", prefixes: ["checkout-", "cart-", "order-", "payment-", "commerce-"] },
];

const OWNER_FILES = {
  foundation: "canonical-foundation.csspart",
  public: "canonical-public.csspart",
  products: "canonical-products.csspart",
  corporate: "canonical-corporate.csspart",
  account: "canonical-account.csspart",
  commerce: "canonical-commerce.csspart",
  mixed: "canonical-mixed.csspart",
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

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
      if (ch === "*" && next === "/") {
        comment = false;
        i += 1;
      }
      continue;
    }
    if (!quote && ch === "/" && next === "*") {
      comment = true;
      i += 1;
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

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

  if (css.slice(start)) blocks.push(css.slice(start));
  if (depth !== 0 || quote || comment) throw new Error("canonical.css has an unbalanced top-level structure");
  return blocks;
}

function classNames(block) {
  return [...block.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((match) => match[1]);
}

function ownerFor(block) {
  const classes = classNames(block);
  if (!classes.length) return "foundation";

  const owners = new Set();
  let unknownClass = false;
  for (const className of classes) {
    const matched = domains.filter((domain) => domain.prefixes.some((prefix) => className.startsWith(prefix)));
    if (matched.length === 0) unknownClass = true;
    for (const domain of matched) owners.add(domain.name);
  }

  if (owners.size === 1 && !unknownClass) return [...owners][0];
  return "mixed";
}

function marker(id) {
  return `/* @canonical-block:${id} */`;
}

function parsePartFile(content) {
  const matches = [...content.matchAll(/\/\* @canonical-block:(\d{6}) \*\//g)];
  const blocks = new Map();
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + current[0].length;
    const end = next ? next.index : content.length;
    blocks.set(current[1], content.slice(start, end));
  }
  return blocks;
}

function audit(source) {
  const blocks = splitTopLevelBlocks(source);
  const counts = {};
  let bytes = 0;
  for (const block of blocks) {
    const owner = ownerFor(block);
    counts[owner] = (counts[owner] ?? 0) + 1;
    bytes += Buffer.byteLength(block);
  }
  console.log(JSON.stringify({
    canonical: "app/canonical.css",
    bytes,
    lines: source.split("\n").length,
    sha256: sha256(source),
    topLevelBlocks: blocks.length,
    ownership: counts,
  }, null, 2));
}

function extract(source) {
  const blocks = splitTopLevelBlocks(source);
  const buckets = new Map(Object.keys(OWNER_FILES).map((owner) => [owner, []]));
  const manifest = {
    version: 1,
    source: "app/canonical.css",
    sourceSha256: sha256(source),
    sourceBytes: Buffer.byteLength(source),
    blockCount: blocks.length,
    order: [],
  };

  blocks.forEach((block, index) => {
    const id = String(index + 1).padStart(6, "0");
    const owner = ownerFor(block);
    manifest.order.push({ id, owner, sha256: sha256(block), bytes: Buffer.byteLength(block) });
    buckets.get(owner).push(`${marker(id)}${block}`);
  });

  fs.mkdirSync(sourceDir, { recursive: true });
  for (const [owner, entries] of buckets) {
    fs.writeFileSync(path.join(sourceDir, OWNER_FILES[owner]), entries.join(""));
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`EXTRACTED — ${blocks.length} blocks into app/styles/canonical-source/*.csspart`);
  verify(source);
}

function rebuildFromParts() {
  if (!fs.existsSync(manifestPath)) throw new Error("canonical source manifest is missing; run --extract first");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const blockMap = new Map();

  for (const [owner, filename] of Object.entries(OWNER_FILES)) {
    const file = path.join(sourceDir, filename);
    if (!fs.existsSync(file)) continue;
    for (const [id, block] of parsePartFile(fs.readFileSync(file, "utf8"))) {
      if (blockMap.has(id)) throw new Error(`duplicate canonical block ${id}`);
      blockMap.set(id, { owner, block });
    }
  }

  let rebuilt = "";
  for (const entry of manifest.order) {
    const found = blockMap.get(entry.id);
    if (!found) throw new Error(`canonical block ${entry.id} is missing`);
    if (found.owner !== entry.owner) throw new Error(`canonical block ${entry.id} owner changed without manifest update`);
    if (sha256(found.block) !== entry.sha256) throw new Error(`canonical block ${entry.id} content drifted`);
    rebuilt += found.block;
  }
  return { manifest, rebuilt };
}

function verify(currentCanonical = fs.readFileSync(canonicalPath, "utf8")) {
  const { manifest, rebuilt } = rebuildFromParts();
  const rebuiltSha = sha256(rebuilt);
  const currentSha = sha256(currentCanonical);
  const errors = [];

  if (rebuiltSha !== manifest.sourceSha256) errors.push(`rebuilt sha ${rebuiltSha} != manifest source sha ${manifest.sourceSha256}`);
  if (currentSha !== manifest.sourceSha256) errors.push(`canonical sha ${currentSha} != manifest source sha ${manifest.sourceSha256}`);
  if (Buffer.byteLength(rebuilt) !== manifest.sourceBytes) errors.push("rebuilt canonical byte size differs from manifest");

  if (errors.length) {
    for (const error of errors) console.error(`FAIL — ${error}`);
    process.exit(1);
  }
  console.log(`PASS — canonical decomposition rebuilds byte-identically (${rebuiltSha})`);
}

const source = fs.readFileSync(canonicalPath, "utf8");
if (mode === "--audit") audit(source);
else if (mode === "--extract") extract(source);
else if (mode === "--verify") verify(source);
else {
  console.error("Usage: node scripts/decompose-canonical-css.mjs [--audit|--extract|--verify]");
  process.exit(1);
}
