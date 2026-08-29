import fs from "node:fs";

let failed = 0;
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => { failed++; console.error(`FAIL  ${message}`); };
const check = (ok, message) => ok ? pass(message) : fail(message);
const read = (path) => fs.readFileSync(path, "utf8");

const required = [
  "app/canonical.css",
  "app/layout.tsx",
  "docs/ACCESSIBILITY_RESPONSIVE_PHASE13_V25.8.54.md",
  "audit/PHASE13_ACCESSIBILITY_RESPONSIVE_AUDIT.json",
];
for (const file of required) check(fs.existsSync(file), `phase13 artifact/current owner exists: ${file}`);
check(!fs.existsSync("app/accessibility-responsive.css"), "retired accessibility-responsive.css stays deleted");
check(!fs.existsSync("app/commerce-flow.css"), "retired commerce-flow.css stays deleted");

const css = read("app/canonical.css");
const layout = read("app/layout.tsx");
const testsReadme = read("tests/README.md");

check(/:focus-visible/.test(css), "focus-visible support retained");
check(/min-height:\s*44px/.test(css), "touch target sizing support retained");
check(/prefers-reduced-motion/.test(css), "reduced-motion support retained");
check(/@media\s*\(max-width:\s*(?:480|620|640|760)px\)/.test(css), "mobile responsive coverage retained");
check(/(?:768px|900px|980px|1100px)/.test(css), "tablet/desktop responsive coverage retained");
check(layout.includes('import "./canonical.css";'), "canonical stylesheet is globally loaded");
check(layout.includes("design-tokens.css") && layout.includes("design-system.css"), "owned token and design-system layers remain imported");
check(!layout.includes("accessibility-responsive.css"), "retired accessibility global layer is not imported");
check(!css.includes("!important"), "canonical CSS remains !important-free");
check(!/var\(--(?:yi|yp|store|brand|ui|y)-/.test(css), "legacy token families remain removed");

const e2ePath = "tests/e2e/phase13-responsive-accessibility.spec.ts";
if (fs.existsSync(e2ePath)) {
  const e2e = read(e2ePath);
  check(/aria|focus-visible/.test(e2e), "responsive accessibility e2e contract references accessibility behavior");
} else {
  console.log("INFO  Playwright phase13 e2e spec is absent (tests/README reset). Not counted as PASS.");
  check(testsReadme.includes("intentionally removed"), "test suite reset is documented");
}

if (failed) process.exit(1);
console.log("\nPhase 13 accessibility + responsive verification passed.");
