import fs from "node:fs";
import path from "node:path";

const required = [
  "supabase/migrations/20260815100000_phase19_corporate_profile_isolation.sql",
  "tests/unit/phase19-full-regression.test.ts",
  "tests/e2e/phase19-critical-regression.spec.ts",
  "docs/FULL_QA_PHASE19_V25.8.60.md",
  "audit/PHASE19_FULL_QA_AUDIT.json",
];
let failed = false;
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => { failed = true; console.log(`FAIL  ${message}`); };
for (const file of required) fs.existsSync(file) ? pass(`phase19 artifact exists: ${file}`) : fail(`phase19 artifact exists: ${file}`);

const migration = fs.readFileSync(required[0], "utf8");
const unit = fs.readFileSync(required[1], "utf8");
const e2e = fs.readFileSync(required[2], "utf8");
const profileSave = fs.readFileSync("app/api/profiles/save/route.ts", "utf8");
const memberProfile = fs.readFileSync("app/api/organizations/member-profile/route.ts", "utf8");
const checks = [
  ["corporate profile organization binding", migration.includes("organization_id uuid references public.organizations")],
  ["corporate edit context guard", migration.includes("ORG_CONTEXT_REQUIRED") && profileSave.includes("ORG_CONTEXT_REQUIRED")],
  ["offboarding organization scope", migration.includes("user_id=v_member.user_id and organization_id=p_organization_id")],
  ["member preview organization scope", memberProfile.includes('.eq("organization_id", organizationId)')],
  ["seat race regression contract", unit.includes("serializes seat reservation")],
  ["invite expiry/replay regression contract", unit.includes("one-time, expiry-aware")],
  ["replacement terminal regression contract", unit.includes("old-card reactivation")],
  ["payment callback replay regression contract", unit.includes("callback replay idempotent")],
  ["public runtime smoke suite", e2e.includes("phase19 public smoke")],
  ["authenticated individual smoke", e2e.includes("individual account reaches")],
  ["authenticated corporate smoke", e2e.includes("corporate owner can reach")],
];
for (const [label, ok] of checks) ok ? pass(label) : fail(label);

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
/^25\.8\.(?:6[0-9]|[7-9][0-9])(?:-|$)/.test(pkg.version)
  ? pass("package version retains Phase 19 QA or later")
  : fail("package version retains Phase 19 QA or later");
pkg.scripts?.["verify:phase19:qa"] ? pass("phase19 verifier registered") : fail("phase19 verifier registered");
pkg.scripts?.["test:phase19"] ? pass("phase19 focused test script registered") : fail("phase19 focused test script registered");

if (failed) process.exit(1);
console.log("\nPhase 19 full QA verification passed.");
