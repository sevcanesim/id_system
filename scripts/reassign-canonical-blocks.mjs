import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonicalPath = path.join(root, "app/canonical.css");
const sourceDir = path.join(root, "app/styles/canonical-source");
const manifestPath = path.join(sourceDir, "manifest.json");
const mode = process.argv.includes("--apply") ? "apply" : "dry-run";
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Number(limitArg?.split("=")[1] ?? 20);

if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  console.error("--limit must be an integer between 1 and 100");
  process.exit(1);
}

const OWNER_FILES = {
  foundation: "canonical-foundation.csspart",
  public: "canonical-public.csspart",
  products: "canonical-products.csspart",
  corporate: "canonical-corporate.csspart",
  account: "canonical-account.csspart",
  commerce: "canonical-commerce.csspart",
  mixed: "canonical-mixed.csspart",
};

const DOMAINS = [
  { name: "foundation", prefixes: ["yi-", "ds-", "section-kicker", "field-grid", "canonical-sidebar-backdrop", "brand-top", "brand-dot"] },
  { name: "public", prefixes: ["home-", "p4-", "support-", "legal-", "public-site-", "public-page-", "public-reference-", "global-app-", "global-header-", "global-main-", "global-brand-", "global-cart-", "global-mobile-", "global-signout-", "global-account-", "global-menu-", "reference-hero", "reference-step-", "reference-topic-", "reference-contact", "reference-section", "reference-band", "reference-actions", "reference-topic", "reference-step", "compact-footer"] },
  { name: "products", prefixes: ["products-", "product-", "nfc-", "how-", "premium-", "yenomi-card-art", "quantity-premium", "wizard-", "physical-white", "physical-purple", "stacked-card-", "brand-back-", "pane-heading", "qr-first-", "brand-pill", "card-art-", "embedded-card-", "qr-fallback-"] },
  { name: "corporate", prefixes: ["corporate-", "corp-", "p10-", "p11-", "p14-", "p18-", "enterprise-", "enterprise", "business-", "v25-", "v26-", "settings-tristate", "company-settings-", "job-title", "license-reference-", "template-", "seat-pack-", "org-save-", "org-name-", "title-request-", "mini-meter"] },
  { name: "account", prefixes: ["p6-", "p7-", "p8-", "p9-", "p12-", "identity-", "compact-card", "compact-identity", "compact-wrap", "compact-cover", "compact-shade", "compact-links", "compact-link-copy", "compact-link", "primary-save", "quick-actions", "auth-message", "profile-state-", "account-loading", "verified-pill"] },
  { name: "commerce", prefixes: ["checkout-", "cart-", "order-", "payment-", "commerce-", "add-to-cart-", "activation-", "admin-", "p5-", "stripe-", "result-", "smart-location-", "pricing-", "price-mono", "price"] },
];

const NEUTRAL_CLASSES = new Set([
  "active",
  "inactive",
  "disabled",
  "hidden",
  "loading",
  "open",
  "selected",
  "visible",
  "mono",
  "metric",
  "caption",
  "sr-only",
  "primary",
  "secondary",
  "theme-light",
  "theme-dark",
  "blue",
  "amber",
  "green",
  "purple",
  "done",
  "empty",
  "waiting",
  "total",
  "actions",
  "error",
  "danger",
  "warning",
  "online",
  "published",
  "ready",
  "recommended",
  "valid",
  "success",
  "info",
  "offline",
  "digital-renewal",
  "secondary-link",
  "text-caption",
  "back",
  "front",
  "white",
  "gold",
  "violet",
  "muted",
  "single",
  "draft",
  "scheduled",
  "allowed",
  "denied",
  "optional-label",
  "highlight",
  "step-counter",
]);

const NEUTRAL_PREFIXES = [
  "is-",
  "has-",
  "aria-",
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function extractSelectorPreludes(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const preludes = [];
  let current = "";
  let depth = 0;
  let inMediaOrSupports = false;
  let mediaDepth = -1;
  let inQuote = null;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];

    if (inQuote) {
      if (char === inQuote && clean[i - 1] !== "\\") {
        inQuote = null;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      inQuote = char;
      current += char;
      continue;
    }

    if (char === "{") {
      const trimmed = current.trim();
      current = "";
      if (/^@(media|supports|container)\b/i.test(trimmed)) {
        inMediaOrSupports = true;
        mediaDepth = depth;
      } else if (trimmed.startsWith("@")) {
        // Skip at-rules like @font-face, @keyframes, @import, @page
      } else if (depth === 0 || (inMediaOrSupports && depth === mediaDepth + 1)) {
        if (trimmed.length > 0) {
          preludes.push(trimmed);
        }
      }
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      current = "";
      if (inMediaOrSupports && depth <= mediaDepth) {
        inMediaOrSupports = false;
        mediaDepth = -1;
      }
    } else {
      current += char;
    }
  }
  return preludes;
}

function classNames(css) {
  const preludes = extractSelectorPreludes(css);
  const classes = new Set();
  for (const prelude of preludes) {
    const sanitized = prelude.replace(/\[[^\]]*\]/g, "");
    for (const match of sanitized.matchAll(/\.([_a-zA-Z][\w-]*)/g)) {
      classes.add(match[1]);
    }
  }
  return [...classes];
}

function domainForClass(className) {
  if (NEUTRAL_CLASSES.has(className) || NEUTRAL_PREFIXES.some((prefix) => className.startsWith(prefix))) return "neutral";
  return DOMAINS.find((domain) => domain.prefixes.some((prefix) => className.startsWith(prefix)))?.name ?? "unknown";
}

function mediaScope(css) {
  const match = css.match(/@media\s*([^\{]+)/);
  return match ? match[1].replace(/\s+/g, " ").trim() : "base";
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

const mixedBlocks = parts.get("mixed");
const classOccurrences = new Map();
for (const [id, css] of mixedBlocks) {
  for (const className of new Set(classNames(css))) {
    const ids = classOccurrences.get(className) ?? [];
    ids.push(id);
    classOccurrences.set(className, ids);
  }
}

const candidates = [];
for (const entry of manifest.order) {
  if (entry.owner !== "mixed") continue;
  const css = mixedBlocks.get(entry.id);
  if (!css || mediaScope(css) !== "base") continue;

  const classes = [...new Set(classNames(css))];
  if (!classes.length) continue;

  const meaningfulOwners = new Set();
  let hasUnknown = false;
  let duplicated = false;

  for (const className of classes) {
    const owner = domainForClass(className);
    if (owner === "unknown") hasUnknown = true;
    else if (owner !== "neutral") {
      meaningfulOwners.add(owner);
      if ((classOccurrences.get(className)?.length ?? 0) > 1) duplicated = true;
    }
  }

  if (hasUnknown || duplicated || meaningfulOwners.size !== 1) continue;
  const targetOwner = [...meaningfulOwners][0];
  candidates.push([entry.id, targetOwner]);
  if (candidates.length >= limit) break;
}

if (!candidates.length) {
  console.log("NO SAFE CANDIDATES — no base-scope, single-domain, non-duplicated mixed blocks remain under the current classifier.");
  process.exit(0);
}

const errors = [];
for (const [id, targetOwner] of candidates) {
  const entry = entriesById.get(id);
  const sourceBlock = mixedBlocks.get(id);
  if (!entry || entry.owner !== "mixed") errors.push(`${id}: expected mixed manifest entry`);
  else if (!sourceBlock) errors.push(`${id}: missing from canonical-mixed.csspart`);
  else if (sha256(sourceBlock) !== entry.sha256) errors.push(`${id}: block hash differs from manifest`);
  else if (!OWNER_FILES[targetOwner]) errors.push(`${id}: unsupported target owner ${targetOwner}`);
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL — ${error}`);
  process.exit(1);
}

console.log(`READY — ${candidates.length} automatically selected canonical blocks can move from mixed to owned domains`);
for (const [id, targetOwner] of candidates) console.log(`${id}: mixed -> ${targetOwner}`);

if (mode === "dry-run") {
  console.log("DRY RUN — no files changed. Re-run with --apply to write ownership changes.");
  process.exit(0);
}

for (const [id, targetOwner] of candidates) {
  const block = mixedBlocks.get(id);
  mixedBlocks.delete(id);
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
  if (!block) {
    console.error(`FAIL — canonical block ${entry.id} missing after reassignment`);
    process.exit(1);
  }
  if (sha256(block) !== entry.sha256) {
    console.error(`FAIL — canonical block ${entry.id} content changed during reassignment`);
    process.exit(1);
  }
  rebuilt += block;
}

const canonical = fs.readFileSync(canonicalPath, "utf8");
const rebuiltSha = sha256(rebuilt);
const canonicalSha = sha256(canonical);
if (rebuiltSha !== manifest.sourceSha256 || canonicalSha !== manifest.sourceSha256) {
  console.error(`FAIL — canonical equivalence drifted (rebuilt ${rebuiltSha}, runtime ${canonicalSha}, expected ${manifest.sourceSha256})`);
  process.exit(1);
}

console.log(`PASS — reassigned ${candidates.length} blocks with byte-identical canonical rebuild (${rebuiltSha})`);
