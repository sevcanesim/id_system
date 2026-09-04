import fs from "node:fs";
import path from "node:path";
import {
  DEMO_CORPORATE_CAPACITY_SCENARIOS,
  DEMO_GUEST_ORDERS,
  DEMO_IDENTITY_COLLISION,
  DEMO_INVITE_FIXTURES,
  DEMO_LOGIN_USERS,
  renderDemoTestUsersMarkdown,
} from "../tests/fixtures/demo-user-matrix.mjs";

const root = process.cwd();
const seed = fs.readFileSync(path.join(root, "scripts/seed-demo-scenarios.mjs"), "utf8");
const typedRegistry = fs.readFileSync(path.join(root, "tests/fixtures/demo-user-matrix.ts"), "utf8");
const docs = fs.readFileSync(path.join(root, "DEMO_TEST_USERS.md"), "utf8");
const baseline = fs.readFileSync(path.join(root, "docs/product-engineering/01_CURRENT_ARCHITECTURE_BASELINE.md"), "utf8");
const localQaHelperPath = path.join(root, "scripts/_qa-demo-matrix.local.mjs");

let failed = 0;
const pass = (label) => console.log(`PASS  ${label}`);
const fail = (label) => {
  failed += 1;
  console.error(`FAIL  ${label}`);
};

const requiredFiles = [
  "tests/fixtures/demo-user-matrix.ts",
  "tests/fixtures/demo-user-matrix.mjs",
  "DEMO_TEST_USERS.md",
];
for (const file of requiredFiles) {
  if (fs.existsSync(path.join(root, file))) pass(`registry file ${file}`);
  else fail(`missing registry file ${file}`);
}

if (seed.includes('from "../tests/fixtures/demo-user-matrix.mjs"')) {
  pass("seed imports the canonical matrix");
} else {
  fail("seed must import tests/fixtures/demo-user-matrix.mjs");
}

if (/const demoUsers\s*=\s*\[/.test(seed) || /const guestOrders\s*=\s*\[/.test(seed) || /const corporateScenarios\s*=\s*\[/.test(seed)) {
  fail("seed must not keep a parallel demoUsers/guestOrders/corporateScenarios array");
} else {
  pass("seed does not duplicate the registry arrays");
}

if (typedRegistry.includes("./demo-user-matrix.mjs")) pass("typed registry re-exports the runtime matrix");
else fail("tests/fixtures/demo-user-matrix.ts must re-export demo-user-matrix.mjs");

if (baseline.includes("tests/fixtures/demo-user-matrix.ts")) pass("architecture baseline cites the matrix");
else fail("01_CURRENT_ARCHITECTURE_BASELINE.md must cite tests/fixtures/demo-user-matrix.ts");

if (docs === renderDemoTestUsersMarkdown()) pass("DEMO_TEST_USERS.md matches renderDemoTestUsersMarkdown()");
else fail("DEMO_TEST_USERS.md is stale; run npm run docs:demo-users");

const loginKeys = new Set();
const loginEmails = new Set();
for (const user of DEMO_LOGIN_USERS) {
  if (!user.key || !user.email || !user.kind || !user.loginScope || !user.intent) {
    fail(`login fixture incomplete: ${user.key || user.email}`);
    continue;
  }
  if (loginKeys.has(user.key)) fail(`duplicate login key ${user.key}`);
  else loginKeys.add(user.key);
  if (loginEmails.has(user.email)) fail(`duplicate login email ${user.email}`);
  else loginEmails.add(user.email);
  if (!user.email.endsWith("@yenomi.test")) fail(`login email must be @yenomi.test: ${user.email}`);
  else pass(`login fixture ${user.email}`);
}

for (const guest of DEMO_GUEST_ORDERS) {
  if (loginEmails.has(guest.email)) fail(`guest order ${guest.email} must not also be a login user`);
  if (!guest.orderNumber || !guest.tokenLabel || !guest.kind || !guest.variantSku) fail(`guest fixture incomplete: ${guest.email}`);
  else pass(`guest fixture ${guest.email}`);
}

for (const invite of DEMO_INVITE_FIXTURES) {
  if (loginEmails.has(invite.email)) fail(`invite fixture ${invite.email} must not also be a login user`);
  if (!invite.email || !invite.kind || !invite.organizationSlug || !invite.role || !invite.status) {
    fail(`invite fixture incomplete: ${invite.email}`);
  } else {
    pass(`invite fixture ${invite.email}`);
  }
}

if (DEMO_IDENTITY_COLLISION.emailPrefix === "demo.ayni.isim." && DEMO_IDENTITY_COLLISION.displayName === "Ahmet Yılmaz") {
  pass("identity collision registry");
} else {
  fail("identity collision registry drifted");
}

const fullFive = DEMO_CORPORATE_CAPACITY_SCENARIOS.find((scenario) => scenario.limit === 5 && scenario.used === 5);
if (fullFive) pass("full 5-seat occupancy is in the matrix");
else fail("matrix missing 5/5 capacity scenario");

const appDir = path.join(root, "app");
function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) found.push(full);
  }
  return found;
}
const appLeak = walk(appDir).filter((file) => fs.readFileSync(file, "utf8").includes("demo-user-matrix"));
if (appLeak.length) fail(`app/ must not import the demo matrix: ${appLeak.map((file) => path.relative(root, file)).join(", ")}`);
else pass("app/ does not import the demo matrix");

const knownNoAuth = new Set([
  ...DEMO_GUEST_ORDERS.map((guest) => guest.email),
  ...DEMO_INVITE_FIXTURES.map((invite) => invite.email),
]);
if (fs.existsSync(localQaHelperPath)) {
  const qaHelper = fs.readFileSync(localQaHelperPath, "utf8");
  const qaEmails = [...qaHelper.matchAll(/email:\s*"(demo\.[^"]+@yenomi\.test)"/g)].map((match) => match[1]);
  for (const email of new Set(qaEmails)) {
    if (loginEmails.has(email) || knownNoAuth.has(email)) pass(`local QA helper email ${email}`);
    else fail(`local QA helper invented ${email}`);
  }
} else {
  pass("gitignored local QA helper is absent (expected in CI)");
}

// Programmatic verification of domain fixtures between matrix & seed
if (DEMO_IDENTITY_COLLISION.emailPrefix === "demo.ayni.isim." && seed.includes("identityCollision")) {
  pass("same-name identity pair");
} else fail("same-name identity pair");

if (seed.includes("identityCollision.displayName")) pass("same-name display collision");
else fail("same-name display collision");

if (seed.includes("YN-LIFEUNASSGN1")) pass("lifecycle unassigned stock");
else fail("lifecycle unassigned stock");

if (seed.includes("YN-QASTOCK0001A")) pass("QA org unassigned stock");
else fail("QA org unassigned stock");

const trBackupUser = DEMO_LOGIN_USERS.find((u) => u.key === "trBackup");
if (trBackupUser?.cards?.some((c) => c.code === "YN-TRBACKALT001") && seed.includes("spec.cards")) {
  pass("backup card pair");
} else fail("backup card pair");

const trLostUser = DEMO_LOGIN_USERS.find((u) => u.key === "trLost");
if (trLostUser?.cards?.some((c) => c.code === "YN-TRLOST000001") && seed.includes("spec.cards")) {
  pass("lost card");
} else fail("lost card");

if (seed.includes('slug: "demo-tr-yeni-kurumsal"')) pass("empty company is owner-only");
else fail("empty company is owner-only");

if (seed.includes("limit: 10, used: 6")) pass("partial occupancy 6/10");
else fail("partial occupancy 6/10");

if (seed.includes("demo.calisan.dijital@yenomi.test again")) pass("duplicate-email is a procedure against an existing member");
else fail("duplicate-email is a procedure against an existing member");

if (seed.includes("no lead domain table exists yet")) pass("lead remains an explicit product gap");
else fail("lead remains an explicit product gap");

if (seed.includes("Şifre DEMO_SEED_PASSWORD")) pass("password stays out of source");
else fail("password stays out of source");

const premiumUser = DEMO_LOGIN_USERS.find((u) => u.key === "trIndividualPremium");
if (premiumUser?.entitlement?.variantSku === "YENOMI-NFC-PREMIUM-ANNUAL" && seed.includes("YENOMI-NFC-PREMIUM-ANNUAL")) {
  pass("premium individual fixture");
} else fail("premium individual fixture");

const expiredUser = DEMO_LOGIN_USERS.find((u) => u.key === "trIndividualExpired");
if (expiredUser?.entitlement?.status === "EXPIRED" && seed.includes("entitlementStatus")) {
  pass("expired entitlement fixture");
} else fail("expired entitlement fixture");

const indLostUser = DEMO_LOGIN_USERS.find((u) => u.key === "trIndividualLost");
if (indLostUser?.cards?.some((c) => c.code === "YN-INDLOST00001") && seed.includes("spec.cards")) {
  pass("individual lost card");
} else fail("individual lost card");

const indBackupUser = DEMO_LOGIN_USERS.find((u) => u.key === "trIndividualBackup");
if (indBackupUser?.cards?.some((c) => c.code === "YN-INDYEDKALT01") && seed.includes("spec.cards")) {
  pass("individual backup card pair");
} else fail("individual backup card pair");

if (seed.includes("YENOMI-NFC-EXTRA")) pass("spare card SKU upsert");
else fail("spare card SKU upsert");

if (seed.includes("user_id: null")) pass("guest orders stay unclaimed");
else fail("guest orders stay unclaimed");

if (seed.includes("demo:${password}:")) pass("activation token derived at apply");
else fail("activation token derived at apply");

if (seed.includes("allocate_corporate_id")) pass("demo orgs allocate corporate_id");
else fail("demo orgs allocate corporate_id");

if (/\bYenomiDemo\d+!/.test(seed) || /\bYenomiDemo\d+!/.test(docs)) {
  fail("seed/docs must not embed the demo password");
} else {
  pass("seed and docs do not embed the demo password");
}

if (failed) {
  console.error(`\nDemo QA matrix verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nDemo QA matrix is locked to the seed registry.");
