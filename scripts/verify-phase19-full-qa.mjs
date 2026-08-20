import fs from "node:fs";

const required = [
  "supabase/migrations/20260815100000_phase19_corporate_profile_isolation.sql",
  "docs/FULL_QA_PHASE19_V25.8.60.md",
  "audit/PHASE19_FULL_QA_AUDIT.json",
  "app/api/profiles/save/route.ts",
  "app/api/organizations/member-profile/route.ts",
  "lib/organizations/lifecycle.test.ts",
  "lib/payments/reuse-open-attempt.test.ts",
];
let failed = false;
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => { failed = true; console.log(`FAIL  ${message}`); };
for (const file of required) fs.existsSync(file) ? pass(`phase19 artifact exists: ${file}`) : fail(`phase19 artifact exists: ${file}`);

const migration = fs.readFileSync(required[0], "utf8");
const profileSave = fs.readFileSync("app/api/profiles/save/route.ts", "utf8");
const memberProfile = fs.readFileSync("app/api/organizations/member-profile/route.ts", "utf8");
const lifecycleTest = fs.readFileSync("lib/organizations/lifecycle.test.ts", "utf8");
const lifecycle = fs.readFileSync("lib/organizations/lifecycle.ts", "utf8");
const paymentAttempt = fs.readFileSync("lib/payments/reuse-open-attempt.test.ts", "utf8");
const checkout = fs.readFileSync("app/api/commerce/checkout/route.ts", "utf8");
const bulkInvite = fs.readFileSync("app/api/organizations/members/bulk-invite/route.ts", "utf8");
const testsReadme = fs.readFileSync("tests/README.md", "utf8");

const checks = [
  ["corporate profile organization binding", migration.includes("organization_id uuid references public.organizations")],
  ["corporate edit context guard", migration.includes("ORG_CONTEXT_REQUIRED") && profileSave.includes("ORG_CONTEXT_REQUIRED")],
  ["offboarding organization scope", migration.includes("user_id=v_member.user_id and organization_id=p_organization_id")],
  ["member preview organization scope", memberProfile.includes('.eq("organization_id", organizationId)')],
  ["seat reservation stays sequential at the invite API", bulkInvite.includes("reserve_organization_invitation") && /SIRAYLA|sequential/i.test(bulkInvite)],
  ["invite expiry and revoke remain domain states", lifecycle.includes('if (invitation.revokedAt) return "REVOKED"') && lifecycle.includes("EXPIRED")],
  ["replacement terminal regression contract", lifecycleTest.includes("replacedByCardId") && lifecycleTest.includes("REPLACED")],
  ["open payment attempt reuse stays explicit", paymentAttempt.includes("reuses a live PENDING session")],
  ["checkout idempotency race is re-read after insert", checkout.includes("racedAttempt") && checkout.includes("idempotency_key")],
];
for (const [label, ok] of checks) ok ? pass(label) : fail(label);

const e2ePath = "tests/e2e/phase19-critical-regression.spec.ts";
if (fs.existsSync(e2ePath)) {
  const e2e = fs.readFileSync(e2ePath, "utf8");
  e2e.includes("phase19 public smoke") ? pass("public runtime smoke suite") : fail("public runtime smoke suite");
  e2e.includes("individual account reaches") ? pass("authenticated individual smoke") : fail("authenticated individual smoke");
  e2e.includes("corporate owner can reach") ? pass("authenticated corporate smoke") : fail("authenticated corporate smoke");
} else {
  console.log("INFO  Playwright phase19 e2e spec is absent (tests/README reset). Not counted as PASS.");
  testsReadme.includes("intentionally removed") ? pass("test suite reset is documented") : fail("test suite reset is documented");
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versionMatch = String(pkg.version || "").match(/^(\d+)\.(\d+)\.(\d+)/);
const versionTuple = versionMatch ? versionMatch.slice(1).map(Number) : [0, 0, 0];
versionTuple[0] > 25 || (versionTuple[0] === 25 && (versionTuple[1] > 8 || (versionTuple[1] === 8 && versionTuple[2] >= 60)))
  ? pass("package version retains Phase 19 QA or later")
  : fail("package version retains Phase 19 QA or later");
pkg.scripts?.["verify:phase19:qa"] ? pass("phase19 verifier registered") : fail("phase19 verifier registered");

if (failed) process.exit(1);
console.log("\nPhase 19 full QA verification passed.");
