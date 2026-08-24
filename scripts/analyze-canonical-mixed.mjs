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
  { name: "public", prefixes: ["home-", "p4-", "support-", "legal-"] },
  { name: "products", prefixes: ["products-", "nfc-", "how-"] },
  { name: "corporate", prefixes: ["corporate-", "corp-", "p10-", "p11-", "enterprise-", "business-"] },
  { name: "account", prefixes: ["p6-", "p7-", "p8-", "p9-", "p12-"] },
  { name: "commerce", prefixes: ["checkout-", "cart-", "order-", "payment-", "commerce-"] },
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

function classNames(css) {
  return [...css.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((match) => match[1]);
}

function selectorPrelude(css) {
  const brace = css.indexOf("{");
  if (brace < 0) return css.trim().slice(0, 240);
  return css.slice(0, brace).replace(/\s+/g, " ").trim().slice(0, 240);
}

function domainForClass(className) {
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
  const domainSet = [...new Set(classes.map(domainForClass))].sort();
  const selector = selectorPrelude(block.css);
  const entry = manifestById.get(block.id);
  return {
    id: block.id,
    orderIndex: entry?.orderIndex ?? -1,
    bytes: Buffer.byteLength(block.css),
    classes,
    domains: domainSet,
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
    count: list.length,
    firstOrder: Math.min(...list.map((item) => item.orderIndex)),
    lastOrder: Math.max(...list.map((item) => item.orderIndex)),
    mediaScopes: [...new Set(list.map((item) => item.media))],
    domains: [...new Set(list.flatMap((item) => item.domains))].sort(),
    blockIds: list.map((item) => item.id),
  }))
  .sort((a, b) => b.count - a.count || (b.lastOrder - b.firstOrder) - (a.lastOrder - a.firstOrder));

const domainMixCounts = new Map();
for (const block of blocks) {
  const key = block.domains.join("+") || "unknown";
  domainMixCounts.set(key, (domainMixCounts.get(key) ?? 0) + 1);
}

const safestCandidates = blocks
  .filter((block) => block.domains.length === 1 && block.domains[0] !== "unknown")
  .filter((block) => block.classes.every((className) => (classOccurrences.get(className)?.length ?? 0) === 1))
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .slice(0, 100)
  .map((block) => ({ id: block.id, domain: block.domains[0], media: block.media, selector: block.selector, bytes: block.bytes }));

const highestRiskBlocks = blocks
  .map((block) => {
    const repeatedClassCount = block.classes.filter((className) => (classOccurrences.get(className)?.length ?? 0) > 1).length;
    const riskScore = repeatedClassCount * 4 + Math.max(0, block.domains.length - 1) * 6 + (block.domains.includes("unknown") ? 3 : 0) + (block.media !== "base" ? 1 : 0);
    return { ...block, repeatedClassCount, riskScore };
  })
  .sort((a, b) => b.riskScore - a.riskScore || b.bytes - a.bytes)
  .slice(0, 50)
  .map((block) => ({
    id: block.id,
    riskScore: block.riskScore,
    repeatedClassCount: block.repeatedClassCount,
    domains: block.domains,
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
  topDuplicateClasses: duplicateClasses.slice(0, 100),
  safestCandidates,
  highestRiskBlocks,
};

console.log(JSON.stringify(report, null, 2));
