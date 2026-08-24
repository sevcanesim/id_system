import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const sourceDir = path.join(root, "app/styles/canonical-source");
const manifestPath = path.join(sourceDir, "manifest.json");
const mixedPath = path.join(sourceDir, "canonical-mixed.csspart");
const auditJsonPath = path.join(root, "audit/CANONICAL_DUPLICATE_CASCADE_PHASE6.json");
const docMdPath = path.join(root, "docs/product-engineering/CANONICAL_DUPLICATE_CASCADE_PHASE6.md");

if (!fs.existsSync(manifestPath) || !fs.existsSync(mixedPath)) {
  console.error("FAIL — manifest.json and canonical-mixed.csspart are required");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const mixedContent = fs.readFileSync(mixedPath, "utf8");

const domains = [
  { name: "foundation", prefixes: ["yi-", "ds-", "section-kicker", "field-grid", "canonical-sidebar-backdrop", "brand-top", "brand-dot"] },
  { name: "public", prefixes: ["home-", "p4-", "support-", "legal-", "public-site-", "public-page-", "public-reference-", "global-app-", "global-header-", "global-main-", "global-brand-", "global-cart-", "global-mobile-", "global-signout-", "global-account-", "global-menu-", "reference-hero", "reference-step-", "reference-topic-", "reference-contact", "reference-section", "reference-band", "reference-actions", "reference-topic", "reference-step", "compact-footer"] },
  { name: "products", prefixes: ["products-", "product-", "nfc-", "how-", "premium-", "yenomi-card-art", "quantity-premium", "wizard-", "physical-white", "physical-purple", "stacked-card-", "brand-back-", "pane-heading", "qr-first-", "brand-pill", "card-art-", "embedded-card-", "qr-fallback-"] },
  { name: "corporate", prefixes: ["corporate-", "corp-", "p10-", "p11-", "p14-", "p18-", "enterprise-", "enterprise", "business-", "v25-", "v26-", "settings-tristate", "company-settings-", "job-title", "license-reference-", "template-", "seat-pack-", "org-save-", "org-name-", "title-request-", "mini-meter"] },
  { name: "account", prefixes: ["p6-", "p7-", "p8-", "p9-", "p12-", "identity-", "compact-card", "compact-identity", "compact-wrap", "compact-cover", "compact-shade", "compact-links", "compact-link-copy", "compact-link", "primary-save", "quick-actions", "auth-message", "profile-state-", "account-loading", "verified-pill"] },
  { name: "commerce", prefixes: ["checkout-", "cart-", "order-", "payment-", "commerce-", "add-to-cart-", "activation-", "admin-", "p5-", "stripe-", "result-", "smart-location-", "pricing-", "price-mono", "price"] },
];

const neutralClasses = new Set([
  "active", "inactive", "disabled", "hidden", "loading", "open", "selected", "visible",
  "mono", "metric", "caption", "sr-only", "primary", "secondary", "theme-light", "theme-dark",
  "blue", "amber", "green", "purple", "done", "empty", "waiting", "total", "actions",
  "error", "danger", "warning", "online", "published", "ready", "recommended", "valid",
  "success", "info", "offline", "digital-renewal", "secondary-link", "text-caption", "back",
  "front", "white", "gold", "violet", "muted", "single", "draft", "scheduled", "allowed",
  "denied", "optional-label", "highlight", "step-counter",
]);

const neutralPrefixes = ["is-", "has-", "aria-"];

function ownershipForClass(className) {
  if (neutralClasses.has(className) || neutralPrefixes.some((p) => className.startsWith(p))) {
    return "neutral";
  }
  for (const domain of domains) {
    if (domain.prefixes.some((p) => className.startsWith(p))) {
      return domain.name;
    }
  }
  return "unknown";
}

function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function calculateSpecificity(selectorStr) {
  let s = selectorStr.trim().replace(/\/\*[\s\S]*?\*\//g, "");

  let ids = 0;
  let classLike = 0;
  let elementLike = 0;

  s = s.replace(/:where\(([^)]+)\)/g, "");

  s = s.replace(/:(not|is|has)\(([^)]+)\)/g, (match, pseudo, inner) => {
    return " " + inner;
  });

  const idMatches = s.match(/#[a-zA-Z0-9_-]+/g);
  if (idMatches) ids += idMatches.length;

  const classMatches = s.match(/\.[a-zA-Z0-9_-]+/g);
  if (classMatches) classLike += classMatches.length;

  const attrMatches = s.match(/\[[^\]]+\]/g);
  if (attrMatches) classLike += attrMatches.length;

  const pseudoElemMatches = s.match(/::[a-zA-Z0-9_-]+/g);
  if (pseudoElemMatches) elementLike += pseudoElemMatches.length;

  const sansPseudoElem = s.replace(/::[a-zA-Z0-9_-]+/g, "");

  const pseudoClassMatches = sansPseudoElem.match(/:[a-zA-Z0-9_-]+/g);
  if (pseudoClassMatches) classLike += pseudoClassMatches.length;

  const cleaned = sansPseudoElem
    .replace(/#[a-zA-Z0-9_-]+/g, "")
    .replace(/\.[a-zA-Z0-9_-]+/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/:[a-zA-Z0-9_-]+/g, "")
    .replace(/[*+~>(),]/g, " ");

  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(word)) {
      elementLike += 1;
    }
  }

  return [ids, classLike, elementLike];
}

function parseDeclarations(bodyStr) {
  const clean = bodyStr.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const pairs = [];
  let current = "";
  let quote = null;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quote) {
      if (ch === quote && clean[i - 1] !== "\\") quote = null;
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ";") {
      if (current.trim()) pairs.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) pairs.push(current.trim());

  const result = [];
  for (const pair of pairs) {
    const colonIndex = pair.indexOf(":");
    if (colonIndex < 0) continue;
    const prop = pair.slice(0, colonIndex).trim().toLowerCase();
    let val = pair.slice(colonIndex + 1).trim();
    let important = false;
    if (/\s*!important\s*$/i.test(val)) {
      important = true;
      val = val.replace(/\s*!important\s*$/i, "").trim();
    }
    val = val.replace(/\s+/g, " ");
    result.push({ property: prop, value: val, important });
  }

  result.sort((a, b) => a.property.localeCompare(b.property) || a.value.localeCompare(b.value));
  return result;
}

function parsePartFile(css) {
  const matches = [...css.matchAll(/\/\* @canonical-block:(\d{6}) \*\//g)];
  const blocks = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + current[0].length;
    const end = next ? next.index : css.length;
    blocks.push({ id: current[1], css: css.slice(start, end) });
  }
  return blocks;
}

function parseBlockRules(css) {
  let cleanCss = "";
  let i = 0;
  while (i < css.length) {
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end < 0) break;
      i = end + 2;
      continue;
    }
    cleanCss += css[i];
    i += 1;
  }

  const rules = [];
  let depth = 0;
  let current = "";
  let quote = null;
  let currentPrelude = "";
  let atRuleHeader = "";
  let atRuleDepth = -1;

  for (let j = 0; j < cleanCss.length; j += 1) {
    const ch = cleanCss[j];
    if (quote) {
      if (ch === quote && cleanCss[j - 1] !== "\\") quote = null;
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === "{") {
      const trimmed = current.trim();
      current = "";
      if (/^@(media|supports|container)\b/i.test(trimmed)) {
        atRuleHeader = trimmed.replace(/\s+/g, " ");
        atRuleDepth = depth;
      } else if (trimmed.startsWith("@")) {
        // skip other at-rules
      } else {
        currentPrelude = trimmed;
      }
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === atRuleDepth) {
        atRuleHeader = "";
        atRuleDepth = -1;
      } else if (currentPrelude) {
        const currentBody = current.trim();
        rules.push({
          scope: atRuleHeader || "base",
          prelude: currentPrelude,
          body: currentBody,
        });
        currentPrelude = "";
      }
      current = "";
    } else {
      current += ch;
    }
  }

  return rules;
}

// Build manifest map
const manifestMap = new Map(manifest.order.map((entry, index) => [entry.id, { ...entry, orderIndex: index }]));
const rawBlocks = parsePartFile(mixedContent);

const parsedBlocks = rawBlocks.map((b) => {
  const manifestEntry = manifestMap.get(b.id);
  const rules = parseBlockRules(b.css);
  const blockClasses = new Set();
  const ruleDetails = [];

  for (const r of rules) {
    const declarations = parseDeclarations(r.body);
    const declHash = sha256(JSON.stringify(declarations));

    // Split selector prelude by comma (ignoring commas in parens/quotes)
    const selectors = [];
    let selCurrent = "";
    let selParen = 0;
    let selQuote = null;

    for (let c = 0; c < r.prelude.length; c += 1) {
      const ch = r.prelude[c];
      if (selQuote) {
        if (ch === selQuote && r.prelude[c - 1] !== "\\") selQuote = null;
        selCurrent += ch;
        continue;
      }
      if (ch === '"' || ch === "'") {
        selQuote = ch;
        selCurrent += ch;
        continue;
      }
      if (ch === "(") selParen += 1;
      else if (ch === ")") selParen -= 1;

      if (ch === "," && selParen === 0) {
        if (selCurrent.trim()) selectors.push(selCurrent.trim());
        selCurrent = "";
      } else {
        selCurrent += ch;
      }
    }
    if (selCurrent.trim()) selectors.push(selCurrent.trim());

    for (const selText of selectors) {
      // Extract class names: \.([_a-zA-Z][\w-]*)
      // Exclude attributes like [class*="..."]
      const sanitized = selText.replace(/\[[^\]]*\]/g, "");
      const matchedClasses = [...sanitized.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((m) => m[1]);

      for (const className of matchedClasses) {
        blockClasses.add(className);
      }

      ruleDetails.push({
        scope: r.scope,
        prelude: selText,
        fullPrelude: r.prelude,
        matchedClasses: [...new Set(matchedClasses)],
        specificity: calculateSpecificity(selText),
        declarations,
        declHash,
      });
    }
  }

  return {
    id: b.id,
    orderIndex: manifestEntry?.orderIndex ?? -1,
    bytes: Buffer.byteLength(b.css),
    css: b.css,
    classes: [...blockClasses],
    rules: ruleDetails,
  };
});

// Scan repository TS/TSX/JS/JSX files
function scanRepositoryCode() {
  const scanDirs = ["app", "components", "lib", "pages", "src"];
  const filePaths = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".next", ".git", "audit", "docs"].includes(entry.name)) {
          walk(full);
        }
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        filePaths.push(full);
      }
    }
  }

  for (const d of scanDirs) walk(path.join(root, d));

  const filesContent = filePaths.map((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    return { filePath: path.relative(root, filePath), content, lines };
  });

  return filesContent;
}

const repoFiles = scanRepositoryCode();

function checkRepoUsage(className) {
  const exactMatches = [];
  const dynamicMatches = [];

  // Check prefix for dynamic match
  const prefix = className.split("-")[0] + "-";

  for (const file of repoFiles) {
    if (!file.content.includes(className) && !file.content.includes(prefix)) {
      continue;
    }

    for (let idx = 0; idx < file.lines.length; idx += 1) {
      const line = file.lines[idx];
      const lineNum = idx + 1;

      // Check exact match
      const regex = new RegExp(`\\b${className.replace(/[-[\]{}()*+? me:\^$|\\]/g, "\\$&")}\\b`);
      if (regex.test(line)) {
        exactMatches.push({
          file: file.filePath,
          line: lineNum,
          snippet: line.trim().slice(0, 120),
        });
      } else if (
        line.includes(prefix) &&
        (/\$\{[^}]+\}/.test(line) || /['"`]\s*\+\s*/.test(line) || /clsx|cn|cva|classNames/.test(line))
      ) {
        dynamicMatches.push({
          file: file.filePath,
          line: lineNum,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }

  if (exactMatches.length > 0) {
    return {
      status: "EXACT_MATCH",
      locations: exactMatches.slice(0, 10),
      totalLocations: exactMatches.length,
    };
  }

  if (dynamicMatches.length > 0) {
    return {
      status: "DYNAMIC_UNCERTAIN",
      locations: dynamicMatches.slice(0, 5),
      totalLocations: dynamicMatches.length,
    };
  }

  return {
    status: "APPEARS_UNUSED",
    locations: [],
    totalLocations: 0,
  };
}

// Group occurrences by duplicated class
const classMap = new Map();

for (const block of parsedBlocks) {
  for (const className of block.classes) {
    if (!classMap.has(className)) {
      classMap.set(className, []);
    }
    // Find matching rules targeting this class in this block
    const matchingRules = block.rules.filter((r) => r.matchedClasses.includes(className));
    classMap.get(className).push({
      blockId: block.id,
      orderIndex: block.orderIndex,
      bytes: block.bytes,
      rules: matchingRules,
    });
  }
}

const duplicatedClassesList = [...classMap.entries()]
  .filter(([, occurrences]) => occurrences.length > 1)
  .map(([className, occurrences]) => {
    const owner = ownershipForClass(className);
    const blockIds = occurrences.map((o) => o.blockId);
    const sourceOrder = occurrences.map((o) => o.orderIndex);
    const firstOrder = Math.min(...sourceOrder);
    const lastOrder = Math.max(...sourceOrder);
    const span = lastOrder - firstOrder;

    const allRules = occurrences.flatMap((o) => o.rules);
    const mediaScopes = [...new Set(allRules.map((r) => r.scope))];
    const selectorsText = [...new Set(allRules.map((r) => r.prelude))];
    const specificities = allRules.map((r) => r.specificity);

    const nonNeutralDomains = new Set();
    for (const bId of blockIds) {
      const blk = parsedBlocks.find((b) => b.id === bId);
      for (const cls of blk.classes) {
        const o = ownershipForClass(cls);
        if (o !== "neutral" && o !== "unknown") nonNeutralDomains.add(o);
      }
    }
    const domainList = [...nonNeutralDomains].sort();
    const featureDomains = domainList.filter((d) => d !== "foundation");

    // Check declaration property names and values
    const propertyNames = new Set();
    const declHashes = new Set();
    const perBlockDecls = [];

    for (const occ of occurrences) {
      const blockProps = {};
      for (const r of occ.rules) {
        declHashes.add(r.declHash);
        for (const d of r.declarations) {
          propertyNames.add(d.property);
          blockProps[d.property] = d.value + (d.important ? " !important" : "");
        }
      }
      perBlockDecls.push({
        blockId: occ.blockId,
        orderIndex: occ.orderIndex,
        scope: occ.rules.map((r) => r.scope).join(", "),
        specificity: occ.rules[0]?.specificity ?? [0, 0, 0],
        declarations: blockProps,
      });
    }

    const declarationsIdentical = declHashes.size === 1;

    // Check if later blocks override earlier properties
    let laterBlocksOverrideEarlier = false;
    const seenProps = new Map(); // prop -> orderIndex

    for (const item of perBlockDecls) {
      for (const [prop, val] of Object.entries(item.declarations)) {
        if (seenProps.has(prop)) {
          laterBlocksOverrideEarlier = true;
        }
        seenProps.set(prop, item.orderIndex);
      }
    }

    // Check specificity equality
    const firstSpec = JSON.stringify(specificities[0]);
    const equalSpecificity = specificities.every((s) => JSON.stringify(s) === firstSpec);

    // Media scope check
    const mediaConditionsDiffer = mediaScopes.length > 1;
    const hasBase = mediaScopes.includes("base");
    const hasNonBase = mediaScopes.some((m) => m !== "base");
    const baseVsResponsive = hasBase && hasNonBase ? "mixed" : hasBase ? "base-only" : "responsive-only";

    // Repository scan
    const repoUsage = checkRepoUsage(className);

    // State / Theme modifier check
    const hasStateOrThemeModifier = allRules.some((r) => {
      return (
        /:hover|:focus|:active|:disabled|:checked|\[aria-|:not|:first-child|:last-child|:nth-child/.test(r.prelude) ||
        /\.(theme-dark|theme-light|is-active|active|open|disabled|selected)\b/.test(r.prelude)
      );
    });

    // Rule & block domains check
    const blockFeatureDomains = domainList.filter((d) => d !== "foundation" && d !== "neutral" && d !== "unknown");
    const isFeatureClass = owner !== "neutral" && owner !== "foundation" && owner !== "unknown";
    const hasConflictingFeatureDomains = isFeatureClass && blockFeatureDomains.length > 1;

    // Categorization logic
    let category = "UNKNOWN_REVIEW";

    if (declarationsIdentical && !mediaConditionsDiffer && equalSpecificity) {
      category = "IDENTICAL_DUPLICATE";
    } else if (laterBlocksOverrideEarlier && !mediaConditionsDiffer && equalSpecificity) {
      category = "LEGACY_PATCH_CHAIN";
    } else if (hasConflictingFeatureDomains) {
      category = "CROSS_DOMAIN_COLLISION";
    } else if (mediaConditionsDiffer) {
      category = "RESPONSIVE_VARIANT";
    } else if (hasStateOrThemeModifier) {
      category = "STATE_VARIANT";
    } else if (!equalSpecificity) {
      category = "SPECIFICITY_LAYER";
    } else {
      category = "PARTIAL_OVERRIDE";
    }

    // Calculate SAFE CLEANUP SCORE (0 - 100)
    let score = 50;
    if (selectorsText.length === 1) score += 15;
    if (!mediaConditionsDiffer) score += 15;
    if (declarationsIdentical) score += 20;
    if (equalSpecificity) score += 10;
    if (domainList.length <= 1) score += 10;
    if (repoUsage.status === "EXACT_MATCH") score += 10;

    if (mediaConditionsDiffer) score -= 25;
    if (!equalSpecificity) score -= 25;
    if (category === "CROSS_DOMAIN_COLLISION") score -= 30;
    if (repoUsage.status === "DYNAMIC_UNCERTAIN") score -= 15;
    if (category === "PARTIAL_OVERRIDE") score -= 15;
    if (category === "LEGACY_PATCH_CHAIN") score -= 10;
    if (category === "UNKNOWN_REVIEW") score -= 20;

    const safeCleanupScore = Math.max(0, Math.min(100, score));

    // For LEGACY_PATCH_CHAIN details
    const propertyEvolution = {};
    const finalWinningDeclarationValues = {};
    const propertiesFullyShadowed = [];
    const propertiesStillContributing = [];

    for (const prop of propertyNames) {
      const occurrencesForProp = perBlockDecls.filter((d) => prop in d.declarations);
      propertyEvolution[prop] = occurrencesForProp.map((o) => ({
        blockId: o.blockId,
        orderIndex: o.orderIndex,
        value: o.declarations[prop],
      }));

      const winning = occurrencesForProp[occurrencesForProp.length - 1];
      finalWinningDeclarationValues[prop] = winning.declarations[prop];

      if (occurrencesForProp.length > 1) {
        propertiesFullyShadowed.push(prop);
      } else {
        propertiesStillContributing.push(prop);
      }
    }

    return {
      className,
      totalOccurrences: occurrences.length,
      canonicalBlockIds: blockIds,
      sourceOrder,
      firstOrder,
      lastOrder,
      sourceSpan: span,
      selectorText: selectorsText,
      mediaScope: mediaScopes,
      ownerClassification: owner,
      domainList,
      declarationPropertyNames: [...propertyNames],
      perBlockDeclarations: perBlockDecls,
      declarationsIdentical,
      laterBlocksOverrideEarlier,
      equalSpecificity,
      mediaConditionsDiffer,
      baseVsResponsive,
      repositoryUsage: repoUsage,
      category,
      safeCleanupScore,

      // Detailed proofs
      declarationHash: [...declHashes][0] ?? "",
      declarationEquivalenceProof: declarationsIdentical
        ? `Identical declaration set across ${blockIds.length} blocks: ${JSON.stringify(perBlockDecls[0].declarations)}`
        : `Divergent declarations across ${blockIds.length} blocks`,
      specificity: specificities[0] ?? [0, 0, 0],
      whyItAppearsSafeToConsolidate:
        category === "IDENTICAL_DUPLICATE"
          ? `Identical declarations, same scope (${mediaScopes[0]}), same specificity, single domain '${owner}'. Merging saves ${blockIds.length - 1} redundant blocks safely.`
          : "Not recommended for automatic consolidation without manual cascade refactoring.",

      // Legacy patch chain fields
      propertyEvolution,
      finalWinningDeclarationValues,
      propertiesFullyShadowed,
      propertiesStillContributing,
    };
  });

// Category counts
const categoryCounts = {
  IDENTICAL_DUPLICATE: 0,
  PARTIAL_OVERRIDE: 0,
  RESPONSIVE_VARIANT: 0,
  STATE_VARIANT: 0,
  SPECIFICITY_LAYER: 0,
  CROSS_DOMAIN_COLLISION: 0,
  LEGACY_PATCH_CHAIN: 0,
  UNKNOWN_REVIEW: 0,
};

for (const item of duplicatedClassesList) {
  categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
}

// Summary lists
const top30HighestOccurrence = [...duplicatedClassesList]
  .sort((a, b) => b.totalOccurrences - a.totalOccurrences || b.sourceSpan - a.sourceSpan)
  .slice(0, 30);

const top30LargestSpans = [...duplicatedClassesList]
  .sort((a, b) => b.sourceSpan - a.sourceSpan || b.totalOccurrences - a.totalOccurrences)
  .slice(0, 30);

const top30IdenticalDuplicates = duplicatedClassesList
  .filter((item) => item.category === "IDENTICAL_DUPLICATE")
  .sort((a, b) => b.safeCleanupScore - a.safeCleanupScore || b.totalOccurrences - a.totalOccurrences)
  .slice(0, 30);

const top30LegacyPatchChains = duplicatedClassesList
  .filter((item) => item.category === "LEGACY_PATCH_CHAIN")
  .sort((a, b) => b.totalOccurrences - a.totalOccurrences || b.sourceSpan - a.sourceSpan)
  .slice(0, 30);

const topCrossDomainCollisions = duplicatedClassesList
  .filter((item) => item.category === "CROSS_DOMAIN_COLLISION")
  .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
  .slice(0, 30);

const responsiveOnlyDuplicates = duplicatedClassesList.filter((item) => item.baseVsResponsive === "responsive-only");

const equalSpecificityConflictingOverrides = duplicatedClassesList.filter(
  (item) => item.equalSpecificity && item.laterBlocksOverrideEarlier && !item.mediaConditionsDiffer
);

const unusedSelectors = duplicatedClassesList.filter((item) => item.repositoryUsage.status === "APPEARS_UNUSED");

const uncertainSelectors = duplicatedClassesList.filter((item) => item.repositoryUsage.status === "DYNAMIC_UNCERTAIN");

// Recommended first cleanup batch
const recommendedFirstBatch = top30IdenticalDuplicates.filter((item) => item.safeCleanupScore === 100).slice(0, 15);
const firstBatchBlocksRemoved = recommendedFirstBatch.reduce((sum, item) => sum + (item.totalOccurrences - 1), 0);
const firstBatchBytesSaved = recommendedFirstBatch.reduce((sum, item) => {
  const blks = item.canonicalBlockIds.map((id) => parsedBlocks.find((b) => b.id === id)).filter(Boolean);
  const redundantBytes = blks.slice(1).reduce((bSum, b) => bSum + b.bytes, 0);
  return sum + redundantBytes;
}, 0);

fs.mkdirSync(path.dirname(auditJsonPath), { recursive: true });
fs.mkdirSync(path.dirname(docMdPath), { recursive: true });

const auditReport = {
  timestamp: new Date().toISOString(),
  baseline: {
    mixedBlocks: parsedBlocks.length,
    mixedBytes: parsedBlocks.reduce((sum, b) => sum + b.bytes, 0),
    uniqueClasses: classMap.size,
    duplicatedClasses: duplicatedClassesList.length,
    duplicateOccurrencesTotal: duplicatedClassesList.reduce((sum, item) => sum + item.totalOccurrences, 0),
  },
  categoryCounts,
  top30HighestOccurrence: top30HighestOccurrence.map((item) => ({
    className: item.className,
    occurrences: item.totalOccurrences,
    category: item.category,
    blockIds: item.canonicalBlockIds,
    score: item.safeCleanupScore,
  })),
  top30LargestSpans: top30LargestSpans.map((item) => ({
    className: item.className,
    span: item.sourceSpan,
    occurrences: item.totalOccurrences,
    category: item.category,
    blockIds: item.canonicalBlockIds,
  })),
  top30IdenticalDuplicates: top30IdenticalDuplicates.map((item) => ({
    className: item.className,
    blockIds: item.canonicalBlockIds,
    exactSelector: item.selectorText,
    exactScope: item.mediaScope,
    declarationHash: item.declarationHash,
    declarationEquivalenceProof: item.declarationEquivalenceProof,
    specificity: item.specificity,
    repositoryUsage: item.repositoryUsage.status,
    whyItAppearsSafeToConsolidate: item.whyItAppearsSafeToConsolidate,
    score: item.safeCleanupScore,
  })),
  top30LegacyPatchChains: top30LegacyPatchChains.map((item) => ({
    className: item.className,
    chronologicalBlockOrder: item.canonicalBlockIds,
    propertyEvolution: item.propertyEvolution,
    finalWinningDeclarationValues: item.finalWinningDeclarationValues,
    propertiesFullyShadowed: item.propertiesFullyShadowed,
    propertiesStillContributing: item.propertiesStillContributing,
    specificity: item.specificity,
    mediaScope: item.mediaScope,
    score: item.safeCleanupScore,
  })),
  topCrossDomainCollisions: topCrossDomainCollisions.map((item) => ({
    className: item.className,
    occurrences: item.totalOccurrences,
    domains: item.domainList,
    blockIds: item.canonicalBlockIds,
    score: item.safeCleanupScore,
  })),
  responsiveOnlyDuplicatesCount: responsiveOnlyDuplicates.length,
  equalSpecificityConflictingOverridesCount: equalSpecificityConflictingOverrides.length,
  unusedSelectorsCount: unusedSelectors.length,
  uncertainSelectorsCount: uncertainSelectors.length,
  recommendedFirstBatch: {
    candidates: recommendedFirstBatch.map((item) => ({
      className: item.className,
      blockIds: item.canonicalBlockIds,
      score: item.safeCleanupScore,
    })),
    estimatedMixedBlocksReduction: firstBatchBlocksRemoved,
    estimatedBytesReduction: firstBatchBytesSaved,
  },
  duplicatedClassesDetail: duplicatedClassesList,
};

// Write JSON audit
fs.writeFileSync(auditJsonPath, `${JSON.stringify(auditReport, null, 2)}\n`);
console.log(`CREATED — ${auditJsonPath}`);

// Generate Markdown documentation
function generateMarkdown() {
  return `# Canonical Duplicate & Cascade Dependency Analysis — Phase 6

> **Phase 6 Audit Baseline**:
> - **mixedBlocks**: ${parsedBlocks.length}
> - **mixedBytes**: ${parsedBlocks.reduce((sum, b) => sum + b.bytes, 0)} B
> - **uniqueClasses**: ${classMap.size}
> - **duplicatedClasses**: ${duplicatedClassesList.length}
> - **duplicateOccurrencesTotal**: ${duplicatedClassesList.reduce((sum, item) => sum + item.totalOccurrences, 0)}

---

## 1. Executive Summary & Category Distribution

Every duplicated CSS class in \`canonical-mixed.csspart\` was analyzed against selector specificity, media/container scopes, domain ownership rules, declaration property values, and repository TS/TSX usage.

Each duplicate has been classified into **exactly one** of the 8 canonical categories:

| Category | Count | Description |
| :--- | :--- | :--- |
| **IDENTICAL_DUPLICATE** | ${categoryCounts.IDENTICAL_DUPLICATE} | Exact matching declarations across blocks in identical scope & specificity. Extremely safe to merge. |
| **LEGACY_PATCH_CHAIN** | ${categoryCounts.LEGACY_PATCH_CHAIN} | Chronological override sequence where later blocks shadow earlier property declarations in same scope. |
| **PARTIAL_OVERRIDE** | ${categoryCounts.PARTIAL_OVERRIDE} | Same scope & specificity, but later blocks add non-overlapping properties or partially override. |
| **RESPONSIVE_VARIANT** | ${categoryCounts.RESPONSIVE_VARIANT} | Duplicate occurrences differ across \`@media\`, \`@supports\`, or \`@container\` breakpoint scopes. |
| **STATE_VARIANT** | ${categoryCounts.STATE_VARIANT} | Occurrences involve state pseudo-classes (\`:hover\`, \`:focus\`) or theme modifier classes (\`.theme-dark\`). |
| **SPECIFICITY_LAYER** | ${categoryCounts.SPECIFICITY_LAYER} | Occurrences target the class with different CSS specificities (e.g. \`.foo\` vs \`.parent .foo\`). |
| **CROSS_DOMAIN_COLLISION** | ${categoryCounts.CROSS_DOMAIN_COLLISION} | Class is used across multiple conflicting product/corporate/commerce domain components. |
| **UNKNOWN_REVIEW** | ${categoryCounts.UNKNOWN_REVIEW} | Edge cases requiring manual architectural review before consolidation. |

---

## 2. Top 30 Highest-Occurrence Duplicated Classes

| Class Name | Total Occurrences | Category | Source Span | Cleanup Score | Canonical Block IDs |
| :--- | :--- | :--- | :--- | :--- | :--- |
${top30HighestOccurrence
  .map(
    (item) =>
      `| \`${item.className}\` | ${item.totalOccurrences} | \`${item.category}\` | ${item.sourceSpan} | ${item.safeCleanupScore} | \`${item.canonicalBlockIds.slice(0, 5).join(", ")}${item.canonicalBlockIds.length > 5 ? "..." : ""}\` |`
  )
  .join("\n")}

---

## 3. Top 30 Largest Source-Order Spans

| Class Name | Source Span | Occurrences | Category | First Order | Last Order | Canonical Block IDs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${top30LargestSpans
  .map(
    (item) =>
      `| \`${item.className}\` | ${item.sourceSpan} | ${item.totalOccurrences} | \`${item.category}\` | ${item.firstOrder} | ${item.lastOrder} | \`${item.canonicalBlockIds.slice(0, 5).join(", ")}${item.canonicalBlockIds.length > 5 ? "..." : ""}\` |`
  )
  .join("\n")}

---

## 4. Top 30 IDENTICAL_DUPLICATE Candidates

The following classes possess 100% identical CSS declarations across their occurrence blocks in matching media scopes. Merging these saves redundant CSS bytes without any visual risk.

${top30IdenticalDuplicates
  .map(
    (item, idx) => `
### ${idx + 1}. \`${item.className}\` (Score: ${item.safeCleanupScore})

- **Block IDs**: \`${item.canonicalBlockIds.join(", ")}\`
- **Exact Selector**: \`${item.selectorText.join(", ")}\`
- **Scope**: \`${item.mediaScope.join(", ")}\`
- **Declaration Hash**: \`${item.declarationHash.slice(0, 16)}\`
- **Equivalence Proof**: \`${item.declarationEquivalenceProof}\`
- **Specificity**: \`[${item.specificity.join(", ")}]\`
- **Repository Usage**: \`${item.repositoryUsage.status}\` (${item.repositoryUsage.totalLocations} locations)
- **Safety Rationale**: ${item.whyItAppearsSafeToConsolidate}
`
  )
  .join("\n")}

---

## 5. Top 30 LEGACY_PATCH_CHAIN Candidates

These classes have evolved across chronological blocks, where later blocks override or shadow earlier property definitions.

${top30LegacyPatchChains
  .map(
    (item, idx) => `
### ${idx + 1}. \`${item.className}\` (Occurrences: ${item.totalOccurrences})

- **Chronological Block Order**: \`${item.canonicalBlockIds.join(" -> ")}\`
- **Final Winning Declarations**: \`${JSON.stringify(item.finalWinningDeclarationValues)}\`
- **Fully Shadowed Properties**: \`${item.propertiesFullyShadowed.join(", ") || "None"}\`
- **Still Contributing Properties**: \`${item.propertiesStillContributing.join(", ") || "None"}\`
- **Specificity**: \`[${item.specificity.join(", ")}]\`
- **Media Scope**: \`${item.mediaScope.join(", ")}\`
`
  )
  .join("\n")}

---

## 6. Top CROSS_DOMAIN_COLLISION Cases

Classes used across multiple domain components that present collision risks:

| Class Name | Occurrences | Domains Involved | Block IDs |
| :--- | :--- | :--- | :--- |
${topCrossDomainCollisions
  .map(
    (item) =>
      `| \`${item.className}\` | ${item.totalOccurrences} | ${item.domainList.join(", ")} | \`${item.canonicalBlockIds.join(", ")}\` |`
  )
  .join("\n")}

---

## 7. Codebase Usage Scans & Risk Metrics

- **Responsive-Only Duplicates**: ${responsiveOnlyDuplicates.length} classes
- **Equal-Specificity Conflicting Overrides**: ${equalSpecificityConflictingOverrides.length} classes
- **Selectors Appearing Unused**: ${unusedSelectors.length} classes
- **Uncertain / Dynamic Usage**: ${uncertainSelectors.length} classes

---

## 8. Recommended First Cleanup Batch

> **Important**: No CSS modifications were performed in Phase 6.

When cleanup begins in Phase 7, the following initial batch of 100-score \`IDENTICAL_DUPLICATE\` candidates is recommended:

- **Candidate Count**: ${recommendedFirstBatch.length} classes
- **Target Classes**: ${recommendedFirstBatch.map((item) => `\`${item.className}\``).join(", ")}
- **Estimated Block Reduction**: ${firstBatchBlocksRemoved} blocks (from ${parsedBlocks.length} to ${parsedBlocks.length - firstBatchBlocksRemoved})
- **Estimated Byte Reduction**: ~${firstBatchBytesSaved} bytes saved
`;
}

fs.writeFileSync(docMdPath, generateMarkdown());
console.log(`CREATED — ${docMdPath}`);
console.log("SUCCESS — Phase 6 duplicate cascade analysis completed cleanly.");
