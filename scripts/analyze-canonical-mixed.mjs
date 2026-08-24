import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "app/styles/canonical-source");
const manifestPath = path.join(sourceDir, "manifest.json");
const mixedPath = path.join(sourceDir, "canonical-mixed.csspart");

if (!fs.existsSync(manifestPath) || !fs.existsSync(mixedPath)) {
  console.error("canonical source decomposition is not active; expected manifest.json and canonical-mixed.csspart");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const mixed = fs.readFileSync(mixedPath, "utf8");

const domains = [
  { name: "foundation", prefixes: ["yi-", "ds-", "section-kicker", "field-grid", "canonical-sidebar-backdrop", "brand-top", "brand-dot"] },
  { name: "public", prefixes: ["home-", "p4-", "support-", "legal-", "public-site-", "public-page-", "public-reference-", "global-app-", "global-header-", "global-main-", "global-brand-", "global-cart-", "global-mobile-", "global-signout-", "global-account-", "global-menu-", "reference-hero", "reference-step-", "reference-topic-", "reference-contact", "reference-section", "reference-band", "reference-actions", "reference-topic", "reference-step", "compact-footer"] },
  { name: "products", prefixes: ["products-", "product-", "nfc-", "how-", "premium-", "yenomi-card-art", "quantity-premium", "wizard-", "physical-white", "physical-purple", "stacked-card-", "brand-back-", "pane-heading", "qr-first-", "brand-pill", "card-art-", "embedded-card-", "qr-fallback-"] },
  { name: "corporate", prefixes: ["corporate-", "corp-", "p10-", "p11-", "p14-", "p18-", "enterprise-", "enterprise", "business-", "v25-", "v26-", "settings-tristate", "company-settings-", "job-title", "license-reference-", "template-", "seat-pack-", "org-save-", "org-name-", "title-request-", "mini-meter"] },
  { name: "account", prefixes: ["p6-", "p7-", "p8-", "p9-", "p12-", "identity-", "compact-card", "compact-identity", "compact-wrap", "compact-cover", "compact-shade", "compact-links", "compact-link-copy", "compact-link", "primary-save", "quick-actions", "auth-message", "profile-state-", "account-loading", "verified-pill"] },
  { name: "commerce", prefixes: ["checkout-", "cart-", "order-", "payment-", "commerce-", "add-to-cart-", "activation-", "admin-", "p5-", "stripe-", "result-", "smart-location-", "pricing-", "price-mono", "price"] },
];

const neutralClasses = new Set([
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

const neutralPrefixes = [
  "is-",
  "has-",
  "aria-",
];

function parsePartFile(content) {
  const matches = [...content.matchAll(/\/\* @canonical-block:(\d{6}) \*\//g)];
  const blocks = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + current[0].length;
    const end = next ? next.index : content.length;
    blocks.push({ id: current[1], css: content.slice(start, end) });
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

function selectorPrelude(css) {
  const brace = css.indexOf("{");
  if (brace < 0) return css.trim().slice(0, 240);
  return css.slice(0, brace).replace(/\s+/g, " ").trim().slice(0, 240);
}

function ownershipForClass(className) {
  if (neutralClasses.has(className) || neutralPrefixes.some((prefix) => className.startsWith(prefix))) return "neutral";
  return domains.find((domain) => domain.prefixes.some((prefix) => className.startsWith(prefix)))?.name ?? "unknown";
}

function mediaScope(css) {
  const match = css.match(/@media\s*([^\{]+)/);
  return match ? match[1].replace(/\s+/g, " ").trim() : "base";
}

function specificityApprox(selector) {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length;
  const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length;
  const elements = (selector.match(/(^|[\s>+~,(])([a-zA-Z][\w-]*)/g) ?? []).length + (selector.match(/::[\w-]+/g) ?? []).length;
  return [ids, classes, elements];
}

const manifestById = new Map(manifest.order.map((entry, index) => [entry.id, { ...entry, orderIndex: index }]));
const blocks = parsePartFile(mixed).map((block) => {
  const classes = [...new Set(classNames(block.css))];
  const classOwnership = classes.map((className) => ({ className, owner: ownershipForClass(className) }));
  const domains = [...new Set(classOwnership.map((item) => item.owner).filter((owner) => owner !== "neutral"))].sort();
  const unknownClasses = classOwnership.filter((item) => item.owner === "unknown").map((item) => item.className);
  const selector = selectorPrelude(block.css);
  const entry = manifestById.get(block.id);
  return {
    id: block.id,
    orderIndex: entry?.orderIndex ?? -1,
    bytes: Buffer.byteLength(block.css),
    classes,
    domains,
    unknownClasses,
    selector,
    media: mediaScope(block.css),
    specificity: specificityApprox(selector),
  };
});

const classOccurrences = new Map();
for (const block of blocks) {
  for (const className of block.classes) {
    const list = classOccurrences.get(className) ?? [];
    list.push(block);
    classOccurrences.set(className, list);
  }
}

const duplicateClasses = [...classOccurrences.entries()]
  .filter(([, list]) => list.length > 1)
  .map(([className, list]) => ({
    className,
    owner: ownershipForClass(className),
    count: list.length,
    firstOrder: Math.min(...list.map((item) => item.orderIndex)),
    lastOrder: Math.max(...list.map((item) => item.orderIndex)),
    mediaScopes: [...new Set(list.map((item) => item.media))],
    domains: [...new Set(list.flatMap((item) => item.domains))].sort(),
    blockIds: list.map((item) => item.id),
  }))
  .sort((a, b) => b.count - a.count || (b.lastOrder - b.firstOrder) - (a.lastOrder - a.firstOrder));

const unknownOccurrences = new Map();
for (const block of blocks) {
  for (const className of block.unknownClasses) {
    unknownOccurrences.set(className, (unknownOccurrences.get(className) ?? 0) + 1);
  }
}

const domainMixCounts = new Map();
for (const block of blocks) {
  const key = block.domains.join("+") || "neutral-only";
  domainMixCounts.set(key, (domainMixCounts.get(key) ?? 0) + 1);
}

const safestCandidates = blocks
  .filter((block) => block.domains.length === 1 && block.domains[0] !== "unknown")
  .filter((block) => block.unknownClasses.length === 0)
  .filter((block) => block.classes.every((className) => {
    const owner = ownershipForClass(className);
    return owner === "neutral" || (classOccurrences.get(className)?.length ?? 0) === 1;
  }))
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .slice(0, 100)
  .map((block) => ({ id: block.id, domain: block.domains[0], media: block.media, selector: block.selector, bytes: block.bytes }));

const highestRiskBlocks = blocks
  .map((block) => {
    const repeatedClassCount = block.classes.filter((className) => (classOccurrences.get(className)?.length ?? 0) > 1).length;
    const realDomains = block.domains.filter((domain) => domain !== "unknown");
    const riskScore = repeatedClassCount * 4 + Math.max(0, realDomains.length - 1) * 6 + block.unknownClasses.length * 3 + (block.media !== "base" ? 1 : 0);
    return { ...block, repeatedClassCount, riskScore };
  })
  .sort((a, b) => b.riskScore - a.riskScore || b.bytes - a.bytes)
  .slice(0, 50)
  .map((block) => ({
    id: block.id,
    riskScore: block.riskScore,
    repeatedClassCount: block.repeatedClassCount,
    domains: block.domains,
    unknownClasses: block.unknownClasses,
    media: block.media,
    specificity: block.specificity,
    selector: block.selector,
  }));

const report = {
  source: "app/styles/canonical-source/canonical-mixed.csspart",
  mixedBlocks: blocks.length,
  mixedBytes: blocks.reduce((sum, block) => sum + block.bytes, 0),
  uniqueClasses: classOccurrences.size,
  duplicatedClasses: duplicateClasses.length,
  domainMixes: Object.fromEntries([...domainMixCounts.entries()].sort((a, b) => b[1] - a[1])),
  topUnknownClasses: [...unknownOccurrences.entries()]
    .map(([className, count]) => ({ className, count }))
    .sort((a, b) => b.count - a.count || a.className.localeCompare(b.className))
    .slice(0, 100),
  topDuplicateClasses: duplicateClasses.slice(0, 100),
  safestCandidates,
  highestRiskBlocks,
};

console.log(JSON.stringify(report, null, 2));
