import fs from "node:fs";
import path from "node:path";

let fail = 0;
const pass = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) fail++;
};

const states = fs.readFileSync("app/components/ui/States.tsx", "utf8");
const corp = fs.readFileSync("app/kurumsal/panel/CorporatePanelClient.tsx", "utf8");
const cards = fs.readFileSync("app/kartlarim/page.tsx", "utf8");
const tokens = fs.readFileSync("app/design-tokens.css", "utf8");
const canonical = fs.readFileSync("app/canonical.css", "utf8");
const testsReadme = fs.readFileSync("tests/README.md", "utf8");

function hasE2eSpecs() {
  const dir = "tests/e2e";
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((name) => /\.(spec|test)\.(ts|tsx|js)$/.test(name));
}

if (hasE2eSpecs()) {
  const quality = fs.readFileSync("tests/e2e/quality-audit.spec.ts", "utf8");
  const phase13 = fs.readFileSync("tests/e2e/phase13-responsive-accessibility.spec.ts", "utf8");
  const visual = fs.readFileSync("tests/e2e/visual-regression.spec.ts", "utf8");
  const role = fs.readFileSync("tests/e2e/auth-role-matrix.spec.ts", "utf8");
  const requiredWidths = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440];
  for (const width of requiredWidths) {
    pass(new RegExp(`width:\\s*${width}\\b`).test(quality) && new RegExp(`width:\\s*${width}\\b`).test(phase13), `responsive contract includes ${width}px`);
  }
  pass(/\["critical",\s*"serious"\]/.test(quality), "authenticated accessibility blocks critical and serious violations");
  pass(/authenticated mobile visual baselines/.test(visual), "authenticated mobile visual suite exists");
  pass(/individual-active-mobile/.test(visual), "individual mobile visual baseline exists");
  pass(/corporate-owner-mobile/.test(visual), "corporate mobile visual baseline exists");
  pass(/checkout-authenticated-mobile/.test(visual), "authenticated checkout mobile visual baseline exists");
  pass(/name: "checkout", path: "\/checkout"/.test(visual), "public checkout is included in visual baselines");
  pass(/demo\.kurumsal\.yonetici@yenomi\.test/.test(role) && /demo\.kurumsal\.admin@yenomi\.test/.test(role) && /demo\.ik\.yonetici@yenomi\.test/.test(role), "role matrix covers owner/admin/hr management roles");
  pass(/mobileNavigation\.isVisible\(\).*desktopNavigation\.isVisible\(\)/s.test(quality), "tablet corporate navigation test validates visible navigation rather than hardcoded breakpoint");
  pass(/seriousA11yViolations/.test(quality) && /failureSummary/.test(quality), "accessibility failures emit concise selector-level diagnostics");
} else {
  console.log("INFO  Playwright e2e specs are absent (tests/README reset). Not counted as PASS.");
  pass(testsReadme.includes("intentionally removed"), "test suite reset is documented");
}

pass(/export function LoadingState/.test(states) && /FoundationEmptyState/.test(states), "canonical loading and empty compatibility states remain available");
pass(/<LoadingState/.test(corp) && /<EmptyState/.test(corp), "corporate critical surface uses canonical loading and empty states");
pass(/yi-empty-app/.test(cards), "individual cards surface uses the live empty state");

pass(/--text-tertiary:/.test(tokens), "canonical tertiary text token remains defined");
pass(canonical.includes("var(--text-tertiary)"), "canonical CSS uses the tertiary text token");
pass(canonical.includes(".p6-auth-page .p6-auth-mini-phone > small"), "auth mini-phone label remains explicit");
pass(canonical.includes(".p10-corporate-platform .enterprise-side-user strong"), "corporate sidebar identity text remains explicit");
pass(/enterprise-mobile-commandbar/.test(corp) && canonical.includes(".enterprise-mobile-commandbar { position:sticky"), "corporate mobile commandbar is enabled on narrow viewports");
pass(/:focus-visible/.test(canonical), "canonical CSS keeps focus-visible support");
pass(/min-width:\s*320px/.test(canonical), "root layout keeps a 320px minimum width");
pass(/@media \(max-width: 760px\)/.test(canonical) || /@media\(max-width:760px\)/.test(canonical), "canonical CSS covers the public mobile breakpoint");

for (const retired of ["app/public-conversion.css", "app/auth-flow.css", "app/globals.css", "app/commerce-flow.css"]) {
  pass(!fs.existsSync(retired), `retired stylesheet stays deleted: ${path.basename(retired)}`);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versionMatch = String(pkg.version || "").match(/^(\d+)\.(\d+)\.(\d+)/);
const versionTuple = versionMatch ? versionMatch.slice(1).map(Number) : [0, 0, 0];
pass(
  versionTuple[0] > 25 || (versionTuple[0] === 25 && (versionTuple[1] > 8 || (versionTuple[1] === 8 && versionTuple[2] >= 54))),
  "package version retains Phase 13 QA or later",
);

if (fail) process.exit(1);
console.log("\nFAZ 3 quality verification passed.");
