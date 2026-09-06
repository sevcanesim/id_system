import fs from "node:fs";

let failed = false;

function pass(message) {
  console.log(`PASS  ${message}`);
}

function fail(message) {
  failed = true;
  console.error(`FAIL  ${message}`);
}

function requireFile(file) {
  if (fs.existsSync(file)) {
    pass(`E2E source exists: ${file}`);
    return;
  }

  fail(`required E2E source is missing: ${file}`);
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const e2eScript = packageJson.scripts?.["test:e2e"];

if (typeof e2eScript === "string" && e2eScript.includes("playwright test")) {
  pass("test:e2e is registered with Playwright");
} else {
  fail("test:e2e must run the Playwright suite");
}

for (const file of [
  "playwright.config.ts",
  "tests/e2e/public-critical.spec.ts",
  "tests/e2e/public-sales-copy.spec.ts",
  "tests/e2e/home-conversion.spec.ts",
  "tests/e2e/responsive-master.spec.ts",
  "tests/e2e/authenticated-visual-layout.spec.ts",
  "tests/e2e/visual-layout-audit.spec.ts",
]) {
  requireFile(file);
}

const testsReadme = fs.readFileSync("tests/README.md", "utf8");
if (testsReadme.includes("focused Playwright critical journeys")) {
  pass("test documentation describes the active Playwright baseline");
} else {
  fail("tests/README.md must describe the active Playwright baseline");
}

if (failed) process.exit(1);

console.log("\nRuntime E2E qualification contract: PASS");
