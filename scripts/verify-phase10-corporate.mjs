import fs from "node:fs";

const checks = [];
const pass = (message, condition) => {
  console.log(`${condition ? "PASS" : "FAIL"}  ${message}`);
  checks.push(condition);
};
const read = (path) => fs.readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const css = read("app/canonical.css");
const corp = read("app/kurumsal/panel/CorporatePanelClient.tsx");
const editor = read("app/olustur/CardWizard.tsx");
const layout = read("app/kurumsal/panel/layout.tsx");
const kartim = read("app/kurumsal/panel/kartim/page.tsx");
const gate = fs.existsSync("app/kurumsal/panel/CorporatePanelGate.tsx")
  ? read("app/kurumsal/panel/CorporatePanelGate.tsx")
  : "";

for (const path of [
  "app/canonical.css",
  "app/kurumsal/panel/CorporatePanelClient.tsx",
  "docs/CORPORATE_PRODUCT_PHASE10_V25.8.51.md",
  "audit/PHASE10_CORPORATE_PRODUCT_AUDIT.json",
]) pass(`phase10 artifact exists: ${path}`, fs.existsSync(path));

pass("single canonical stylesheet remains authoritative", fs.existsSync("app/canonical.css"));
pass("canonical CSS contains no !important", !css.includes("!important"));
pass("canonical CSS contains no legacy yi token family", !/var\(--(?:yi|yp|store|brand|ui|y)-/.test(css));
pass("corporate panel activates dashboard context", corp.includes("p10-corporate-platform") && corp.includes('data-ui-context="dashboard"'));
pass("corporate panel uses pathname-aware tab routing", corp.includes("usePathname") && corp.includes("tabRoutes"));
pass(
  "corporate Kartım route mounts CardWizard instead of the management shell",
  layout.includes("CorporatePanelGate") &&
    layout.includes("Suspense") &&
    !layout.includes("void children") &&
    gate.includes('pathname === "/kurumsal/panel/kartim"') &&
    kartim.includes("<CardWizard") &&
    editor.includes("/kurumsal/panel/kartim?business=1"),
);
pass("duplicate desktop business tabs remain removed", !corp.includes('className="business-tabs"'));
pass("duplicate AppHeader remains removed from corporate panel", !corp.includes("<AppHeader"));
pass("corporate editor retains dashboard context", editor.includes("p8-corporate-editor") && editor.includes('data-ui-context="dashboard"'));
pass("corporate editor has responsive layout contract", css.includes(".p8-corporate-editor") && css.includes("@media (max-width: 760px)"));
pass("corporate dashboard has canonical composition layer", [
  ".p10-corporate-platform",
  ".business-company-picker",
  ".business-account-strip",
  ".business-kpis",
].every((selector) => css.includes(selector)));
pass("corporate dashboard mobile layout is defined", css.includes(".p10-corporate-platform .business-kpis { grid-template-columns:1fr; }"));
pass("retired corporate-platform.css is absent", !fs.existsSync("app/corporate-platform.css"));
pass("phase10 verifier remains registered", pkg.scripts?.["verify:phase10:corporate"] === "node scripts/verify-phase10-corporate.mjs");

if (checks.some((value) => !value)) process.exit(1);
console.log("\nPhase 10 corporate product verification passed.");
