import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const quality = fs.readFileSync(".github/workflows/quality.yml", "utf8");
const staging = fs.readFileSync(".github/workflows/staging-integration.yml", "utf8");
const production = fs.readFileSync(".github/workflows/production-deploy.yml", "utf8");
const smoke = fs.readFileSync("scripts/verify-production-smoke.mjs", "utf8");
const drift = fs.readFileSync("scripts/verify-migration-drift-runtime.mjs", "utf8");

let failed = false;
function check(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else {
    console.error(`FAIL  ${message}`);
    failed = true;
  }
}

check(staging.includes("npm run verify:migration-drift"), "staging promotion blocks on local/remote migration drift");
check(staging.includes("npm run verify:phase20:staging"), "staging promotion uses canonical Phase 20 gate");
check(staging.includes("npm run verify:release"), "staging promotion verifies source quality before mutation");
check(!staging.includes("test:visual") && !staging.includes("playwright"), "staging workflow keeps legacy visual Playwright gate removed");
check(!staging.includes("npm run test:quality"), "staging workflow does not revive the removed quality Playwright suite");

check(quality.includes("npm run verify:p0:static") && quality.includes("npm run verify:release"), "quality workflow retains source-quality and release gates");
check(!quality.includes("test:visual") && !quality.includes("playwright"), "quality workflow keeps legacy visual Playwright gate removed");

check(production.includes("needs: staging-gate"), "production deploy cannot start before reusable staging gate");
check(production.includes("npm run verify:phase20:production"), "production env/build contract runs before deploy");
check(production.includes("npm run verify:faz10:smoke"), "production deploy is followed by live smoke verification");

for (const route of ["'/'", "'/giris'", "'/urunler'", "'/urunler/nfc-kart'", "'/robots.txt'"]) {
  check(smoke.includes(route), `production smoke covers ${route.replaceAll("'", "")}`);
}

check(packageJson.scripts["verify:faz10:local"]?.includes("verify:faz9:local"), "FAZ 10 local qualification includes frozen FAZ 9 baseline");
check(packageJson.scripts["verify:faz10:staging"]?.includes("verify:migration-drift"), "FAZ 10 staging command explicitly checks migration drift");
check(packageJson.scripts["verify:faz10:production"]?.includes("verify:phase20:production"), "FAZ 10 production command uses canonical production gate");
check(packageJson.scripts["verify:faz10:smoke"]?.includes("verify-production-smoke.mjs"), "FAZ 10 exposes live production smoke");
check(packageJson.scripts["verify:faz10:static"]?.includes("verify:faz9:static"), "FAZ 10 static qualification includes frozen FAZ 9 baseline");

check(!packageJson.scripts["verify:visual-contract"], "legacy verify:visual-contract stays unregistered");
check(!packageJson.scripts["verify:faz10:staging:visual"], "FAZ 10 does not re-register removed staging visual gate");
check(!packageJson.scripts["verify:faz10:visual:refresh"], "FAZ 10 does not re-register Darwin visual baseline refresh");
check(!fs.existsSync("scripts/refresh-faz10-visual-baselines.mjs"), "visual baseline refresh script stays deleted");

check(drift.includes("supabase link --project-ref"), "migration drift diagnostic gives explicit Supabase link recovery");

if (failed) process.exit(1);
console.log("\nFAZ 10 runtime/promotion contract verification passed.");
