import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonicalPath = path.join(root, "app/canonical.css");
const sourceDir = path.join(root, "app/styles/canonical-source");
const manifestPath = path.join(sourceDir, "manifest.json");
const mode = process.argv.includes("--apply") ? "apply" : "dry-run";

const OWNER_FILES = {
  foundation: "canonical-foundation.csspart",
  public: "canonical-public.csspart",
  products: "canonical-products.csspart",
  corporate: "canonical-corporate.csspart",
  account: "canonical-account.csspart",
  commerce: "canonical-commerce.csspart",
  mixed: "canonical-mixed.csspart",
};

const BATCH = [
  ["000209", "products"],
  ["000481", "corporate"],
  ["000825", "corporate"],
  ["000885", "foundation"],
  ["000925", "foundation"],
  ["000926", "foundation"],
  ["000927", "foundation"],
  ["000932", "foundation"],
  ["000933", "foundation"],
  ["000944", "foundation"],
];

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function marker(id) { return `/* @canonical-block:${id} */`; }
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

if (!fs.existsSync(manifestPath)) {
  console.error("canonical source decomposition is not active");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entriesById = new Map(manifest.order.map((entry) => [entry.id, entry]));
const parts = new Map();
for (const [owner, filename] of Object.entries(OWNER_FILES)) {
  const file = path.join(sourceDir, filename);
  parts.set(owner, fs.existsSync(file) ? parsePartFile(fs.readFileSync(file, "utf8")) : new Map());
}

const errors = [];
for (const [id, targetOwner] of BATCH) {
  const entry = entriesById.get(id);
  if (!entry) { errors.push(`${id}: missing from manifest`); continue; }
  if (entry.owner !== "mixed") { errors.push(`${id}: expected mixed owner, found ${entry.owner}`); continue; }
  const sourceBlock = parts.get("mixed").get(id);
  if (!sourceBlock) { errors.push(`${id}: missing from canonical-mixed.csspart`); continue; }
  if (sha256(sourceBlock) !== entry.sha256) { errors.push(`${id}: block hash differs from manifest`); continue; }
  if (!OWNER_FILES[targetOwner]) errors.push(`${id}: unsupported target owner ${targetOwner}`);
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL — ${error}`);
  process.exit(1);
}

console.log(`READY — ${BATCH.length} canonical blocks can move from mixed to owned domains`);
for (const [id, targetOwner] of BATCH) console.log(`${id}: mixed -> ${targetOwner}`);
if (mode === "dry-run") {
  console.log("DRY RUN — no files changed. Re-run with --apply to write ownership changes.");
  process.exit(0);
}

for (const [id, targetOwner] of BATCH) {
  const block = parts.get("mixed").get(id);
  parts.get("mixed").delete(id);
  parts.get(targetOwner).set(id, block);
  entriesById.get(id).owner = targetOwner;
}

for (const [owner, filename] of Object.entries(OWNER_FILES)) {
  const ids = manifest.order.filter((entry) => entry.owner === owner).map((entry) => entry.id);
  const content = ids.map((id) => `${marker(id)}${parts.get(owner).get(id) ?? ""}`).join("");
  fs.writeFileSync(path.join(sourceDir, filename), content);
}
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

let rebuilt = "";
for (const entry of manifest.order) {
  const block = parts.get(entry.owner).get(entry.id);
  if (!block) { console.error(`FAIL — canonical block ${entry.id} missing after reassignment`); process.exit(1); }
  if (sha256(block) !== entry.sha256) { console.error(`FAIL — canonical block ${entry.id} content changed during reassignment`); process.exit(1); }
  rebuilt += block;
}

const canonical = fs.readFileSync(canonicalPath, "utf8");
const rebuiltSha = sha256(rebuilt);
const canonicalSha = sha256(canonical);
if (rebuiltSha !== manifest.sourceSha256 || canonicalSha !== manifest.sourceSha256) {
  console.error(`FAIL — canonical equivalence drifted (rebuilt ${rebuiltSha}, runtime ${canonicalSha}, expected ${manifest.sourceSha256})`);
  process.exit(1);
}
console.log(`PASS — reassigned ${BATCH.length} blocks with byte-identical canonical rebuild (${rebuiltSha})`);
