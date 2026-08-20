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
  if (!guest.orderNumber || !guest.tokenLabel || !guest.kind) fail(`guest fixture incomplete: ${guest.email}`);
  else pass(`guest fixture ${guest.email}`);
}

for (const invite of DEMO_INVITE_FIXTURES) {
  if (loginEmails.has(invite.email)) fail(`invite fixture ${invite.email} must not also be a login user`);
  if (seed.includes(`email: "${invite.email}"`) || seed.includes(`email:"${invite.email}"`)) {
    pass(`invite apply ${invite.email}`);
  } else {
    fail(`seed apply missing invite ${invite.email}`);
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

const requiredNeedles = [
  ["pending invite stays INVITED", 'status: "INVITED"'],
  ["same-name identity pair", "demo.ayni.isim."],
  ["same-name display collision", 'full_name:"Ahmet Yılmaz"'],
  ["lifecycle unassigned stock", "YN-LIFEUNASSGN1"],
  ["QA org unassigned stock", "YN-QASTOCK0001A"],
  ["backup card pair", "YN-TRBACKALT001"],
  ["lost card", "YN-TRLOST000001"],
  ["empty company is owner-only", 'slug:"demo-tr-yeni-kurumsal"'],
  ["partial occupancy 6/10", "limit:10, used:6"],
  ["department manager is Satış-scoped", '"trDepartmentManager","DEPARTMENT_MANAGER","ACTIVE","Departman Yöneticisi","Satış"'],
  ["duplicate-email is a procedure against an existing member", "demo.calisan.dijital@yenomi.test again"],
  ["lead remains an explicit product gap", "no lead domain table exists yet"],
  ["password stays out of source", "Şifre DEMO_SEED_PASSWORD"],
  ["premium individual fixture", "YENOMI-NFC-PREMIUM-ANNUAL"],
  ["expired entitlement fixture", 'entitlementStatus: "EXPIRED"'],
  ["individual lost card", "YN-INDLOST00001"],
  ["individual backup card pair", "YN-INDYEDKALT01"],
  ["spare card SKU upsert", "YENOMI-NFC-EXTRA"],
  ["guest orders stay unclaimed", "user_id: null"],
  ["activation token derived at apply", "demo:${password}:"],
  ["demo orgs allocate corporate_id", "allocate_corporate_id"],
];

for (const [label, needle] of requiredNeedles) {
  if (seed.includes(needle)) pass(label);
  else fail(label);
}

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
