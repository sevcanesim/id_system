import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed++; console.error(`FAIL  ${m}`); };
const check = (cond, m) => cond ? pass(m) : fail(m);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const required = [
  "app/design-tokens.css",
  "app/design-system.css",
  "app/components/ui/DesignSystem.tsx",
  "app/components/ui/index.ts",
  "docs/DESIGN_SYSTEM_FOUNDATION_V25.8.42.md",
];
for (const file of required) check(fs.existsSync(path.join(root, file)), `foundation artifact exists: ${file}`);

const tokens = read("app/design-tokens.css");
const canonicalTokens = [
  "--background","--surface","--surface-secondary","--surface-elevated",
  "--text-primary","--text-secondary","--text-tertiary","--text-inverse",
  "--border","--border-strong","--primary","--primary-hover","--primary-active","--primary-subtle",
  "--success","--success-subtle","--warning","--warning-subtle","--error","--error-subtle","--info","--info-subtle",
  "--radius-xs","--radius-sm","--radius-md","--radius-lg","--radius-xl","--radius-full",
  "--shadow-xs","--shadow-sm","--shadow-md","--shadow-overlay",
  "--space-1","--space-2","--space-3","--space-4","--space-5","--space-6","--space-8","--space-10","--space-12","--space-16","--space-20","--space-24","--space-30",
];
for (const token of canonicalTokens) check(tokens.includes(`${token}:`), `canonical token defined: ${token}`);

const aliases = ["--yi-bg: var(--background)","--brand-void: var(--background)","--store-bg: var(--background)","--ui-bg: var(--background)","--y-ink: var(--text-primary)"];
for (const alias of aliases) check(tokens.includes(alias), `legacy family bridged: ${alias.split(":")[0]}`);
if (fs.existsSync(path.join(root,"docs/LEGACY_REMOVAL_PHASE14_V25.8.55.md"))) check(!tokens.includes("--yp-bg:"), "Phase 14 removed obsolete yp token family"); else check(tokens.includes("--yp-bg: var(--background)"), "legacy family bridged: --yp-bg");

const layout = read("app/layout.tsx");
const tokenPos = layout.indexOf('import "./design-tokens.css";');
const legacyPos = layout.indexOf('import "./legacy-surfaces.css";');
check(tokenPos > legacyPos && tokenPos !== -1, "canonical tokens load after legacy CSS cascade");
check(layout.includes('import "./design-system.css";'), "design system component styles imported globally");

const ds = read("app/components/ui/DesignSystem.tsx") + "\n" + read("app/components/ui/Interactive.tsx");
const exportsRequired = ["Button","Card","Badge","PageHeader","Field","Input","Select","Textarea","Checkbox","Switch","EmptyState","Skeleton","Modal","Drawer","Tabs","Toast","DataTable","Container","Stack","Grid"];
for (const name of exportsRequired) check(new RegExp(`export function ${name}\\b`).test(ds), `foundation component exported: ${name}`);

const newCss = read("app/design-system.css");
const forbiddenLegacy = /var\(--(?:yi|yp|brand|store|ui|y)-/g;
check(!forbiddenLegacy.test(newCss), "new component CSS uses no legacy token family");
forbiddenLegacy.lastIndex = 0;
check(!forbiddenLegacy.test(ds), "new component TSX uses no legacy token family");
check(read("app/components/ui/Interactive.tsx").startsWith('"use client";'), "interactive primitives have an explicit client boundary");

const states = read("app/components/ui/States.tsx");
check(states.includes('from "./DesignSystem"'), "existing shared states migrated onto canonical foundation");

for (const file of ["app/design-tokens.css","app/design-system.css"]) {
  const text = read(file);
  let balance = 0;
  for (const ch of text) { if (ch === "{") balance++; else if (ch === "}") balance--; }
  check(balance === 0, `CSS brace balance: ${file}`);
}

const pkg = JSON.parse(read("package.json"));
check(/^25\.(?:8\.(?:4[2-9]|[5-9]\d|\d{3,})|9\.\d+|(?:\d{2,})\.\d+)$/.test(pkg.version), "package version retains Phase 2 foundation or later");
check(pkg.scripts?.["verify:phase2:foundation"] === "node scripts/verify-phase2-foundation.mjs", "phase2 verifier script registered");

if (failed) {
  console.error(`\nPhase 2 foundation verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nPhase 2 design system foundation verification passed.");
