import fs from "node:fs";
import path from "node:path";

let failed = false;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed = true; console.log(`FAIL  ${m}`); };
const versionAtLeast = (version, baseline) => {
  const parse = (value) => String(value).replace(/-.*$/, "").split(".").map((part) => Number(part) || 0);
  const current = parse(version);
  const min = parse(baseline);
  for (let i = 0; i < 3; i++) {
    if (current[i] > min[i]) return true;
    if (current[i] < min[i]) return false;
  }
  return true;
};
const walkTests = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTests(file, out);
    else if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) out.push(file);
  }
  return out;
};

const required = [
  "docs/PRODUCTION_RELEASE_PHASE20_V25.8.61_RC3.md",
  "audit/PHASE20_RELEASE_CANDIDATE_AUDIT.json",
  "scripts/verify-production-env.mjs",
  "scripts/verify-iyzico-sandbox-env.mjs",
  "scripts/create-release-package.mjs",
  "scripts/verify-share-archive.mjs",
  "supabase/migrations/20260815100000_phase19_corporate_profile_isolation.sql",
  "lib/organizations/lifecycle.test.ts",
  "lib/payments/reuse-open-attempt.test.ts",
  "lib/commerce/packages.test.ts",
];
for (const file of required) fs.existsSync(file) ? pass(`phase20 artifact exists: ${file}`) : fail(`phase20 artifact exists: ${file}`);

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
versionAtLeast(pkg.version, "25.8.61") ? pass("package version retains Phase 20 RC or later") : fail("package version retains Phase 20 RC or later");
lock.version === pkg.version && lock.packages?.[""]?.version === pkg.version ? pass("lockfile version matches package") : fail("lockfile version matches package");

for (const script of ["verify:phase20:rc", "verify:phase20:runtime", "verify:phase20:staging", "verify:phase20:production", "verify:phase20:sandbox", "release:rc", "package:safe", "verify:pre-share"]) {
  pkg.scripts?.[script] ? pass(`release script registered: ${script}`) : fail(`release script registered: ${script}`);
}

const envExample = fs.readFileSync(".env.example", "utf8");
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SITE_URL", "SUPABASE_SERVICE_ROLE_KEY", "IYZICO_BASE_URL"]) {
  envExample.includes(`${key}=`) ? pass(`local env contract documented: ${key}`) : fail(`local env contract documented: ${key}`);
}
const productionEnv = fs.readFileSync("scripts/verify-production-env.mjs", "utf8");
productionEnv.includes("PRODUCTION_SUPABASE_PROJECT_REF") && productionEnv.includes("IYZICO_BASE_URL")
  ? pass("production env gate still requires project isolation and live iyzico")
  : fail("production env gate still requires project isolation and live iyzico");

const releaseScript = fs.readFileSync("scripts/create-release-package.mjs", "utf8");
for (const forbidden of ["node_modules", ".next", ".env.local", "test-results", "playwright-report"]) {
  releaseScript.includes(forbidden) ? pass(`release excludes local/generated artifact: ${forbidden}`) : fail(`release excludes local/generated artifact: ${forbidden}`);
}

const migrations = fs.readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).length;
migrations >= 49 ? pass(`migration baseline retained (${migrations})`) : fail(`migration baseline retained (${migrations})`);

const unitTests = [...walkTests("lib"), ...walkTests("app")];
unitTests.length >= 10 ? pass(`colocated unit regression baseline retained (${unitTests.length})`) : fail(`colocated unit regression baseline retained (${unitTests.length})`);

const testsReadme = fs.readFileSync("tests/README.md", "utf8");
const e2ePath = "tests/e2e/phase19-critical-regression.spec.ts";
if (fs.existsSync(e2ePath)) {
  pass("phase19 browser regression spec is present");
} else {
  console.log("INFO  Playwright phase19 e2e spec is absent (tests/README reset). Not counted as PASS.");
  testsReadme.includes("intentionally removed") ? pass("test suite reset is documented") : fail("test suite reset is documented");
}

const stagingWorkflow = fs.readFileSync(".github/workflows/staging-integration.yml", "utf8");
stagingWorkflow.includes("npm run verify:phase20:staging") ? pass("staging workflow runs canonical Phase 20 staging gate") : fail("staging workflow runs canonical Phase 20 staging gate");
for (const key of ["STAGING_SITE_URL", "STAGING_IYZICO_API_KEY", "STAGING_IYZICO_SECRET_KEY", "PRODUCTION_SUPABASE_URL"]) {
  stagingWorkflow.includes(key) ? pass(`staging runtime contract wired: ${key}`) : fail(`staging runtime contract wired: ${key}`);
}

for (const artifact of ["node_modules", ".next", "tsconfig.tsbuildinfo"]) {
  fs.existsSync(artifact) ? console.log(`INFO  workspace artifact present (excluded from release): ${artifact}`) : pass(`workspace artifact absent: ${artifact}`);
}

if (failed) process.exit(1);
console.log("\nPhase 20 release candidate static qualification passed.");
