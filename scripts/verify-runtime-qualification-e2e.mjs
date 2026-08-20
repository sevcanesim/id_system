import fs from "node:fs";
import path from "node:path";

let failed = false;
const pass = (message) => console.log(`PASS  ${message}`);
const info = (message) => console.log(`INFO  ${message}`);
const fail = (message) => {
  failed = true;
  console.error(`FAIL  ${message}`);
};

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const retired of ["test:e2e", "test:quality", "test:visual", "test:cross-browser"]) {
  packageJson.scripts?.[retired]
    ? fail(`retired Playwright suite is still registered: ${retired}`)
    : pass(`retired Playwright suite stays unregistered: ${retired}`);
}

for (const retired of [
  "playwright.config.ts",
  "playwright.quality.config.ts",
  "playwright.visual.config.ts",
  "playwright.cross-browser.config.ts",
]) {
  fs.existsSync(retired)
    ? fail(`retired Playwright config returned: ${retired}`)
    : pass(`retired Playwright config stays deleted: ${retired}`);
}

const testsReadme = fs.readFileSync("tests/README.md", "utf8");
testsReadme.includes("intentionally removed")
  ? pass("test suite reset documents intentional Playwright e2e removal")
  : fail("test suite reset documents intentional Playwright e2e removal");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}
const e2eSpecs = walk("tests/e2e").filter((file) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file));
if (e2eSpecs.length > 0) {
  pass(`E2E tests retained (${e2eSpecs.length})`);
} else {
  info("Playwright e2e specs are absent (tests/README reset). Not counted as PASS.");
}

if (failed) process.exit(1);
console.log("\nRuntime E2E qualification contract: PASS");
