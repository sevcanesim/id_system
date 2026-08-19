import fs from "node:fs";

let failed = 0;
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => { failed++; console.error(`FAIL  ${message}`); };
const check = (ok, message) => ok ? pass(message) : fail(message);
const read = (path) => fs.readFileSync(path, "utf8");

const required = [
  "app/canonical.css",
  "app/layout.tsx",
  "tests/e2e/phase13-responsive-accessibility.spec.ts",
  "docs/ACCESSIBILITY_RESPONSIVE_PHASE13_V25.8.54.md",
  "audit/PHASE13_ACCESSIBILITY_RESPONSIVE_AUDIT.json",
];
for (const file of required) check(fs.existsSync(file), `phase13 artifact/current owner exists: ${file}`);

const css = read("app/canonical.css");
const layout = read("app/layout.tsx");
const e2e = read("tests/e2e/phase13-responsive-accessibility.spec.ts");

check(/:focus-visible/.test(css), "focus-visible support retained");
check(/44px|--touch-target/.test(css), "touch target sizing support retained");
check(/prefers-reduced-motion/.test(css), "reduced-motion support retained");
check(/@media\s*\(max-width:\s*(?:480|620|640|760)px\)/.test(css), "mobile responsive coverage retained");
check(/(?:768px|900px|980px|1100px)/.test(css), "tablet/desktop responsive coverage retained");
check(/aria|focus-visible/.test(e2e), "responsive accessibility e2e contract references accessibility behavior");
check(layout.includes('import "./canonical.css";'), "canonical stylesheet is globally loaded");
check(!layout.includes("design-tokens.css") && !layout.includes("design-system.css"), "retired split stylesheet imports are absent");
check(!layout.includes("accessibility-responsive.css"), "retired accessibility global layer is not imported");
check(!css.includes("!important"), "canonical CSS remains !important-free");
check(!/var\(--(?:yi|yp|store|brand|ui|y)-/.test(css), "legacy token families remain removed");

if (failed) process.exit(1);
console.log("\nPhase 13 accessibility + responsive verification passed.");
