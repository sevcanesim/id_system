import { readFileSync } from "node:fs";

const source = readFileSync("e2e/critical-journeys.spec.ts", "utf8");

function fail(message) {
  console.error(`Critical journeys coverage BAŞARISIZ: ${message}`);
  process.exit(1);
}

const IDS = ["E2E-01", "E2E-02", "E2E-03", "E2E-04", "E2E-05", "E2E-06", "E2E-07"];
for (const id of IDS) {
  if (!source.includes(`test("${id}`)) fail(`${id} named test is missing from e2e/critical-journeys.spec.ts.`);
}

if (!source.includes('test("E2E-06 spare card stays gated for guests"')) {
  fail("E2E-06 must remain the guest spare-card gate.");
}
if (!source.includes('page.goto("/urunler"') || !source.includes("YEDEK KART")) {
  fail("E2E-06 must actually open /urunler and assert the spare-card gate.");
}

const e2e06 = source.slice(source.indexOf('test("E2E-06'), source.indexOf('test("E2E-07'));
if (e2e06.includes("test.skip(true")) {
  fail("E2E-06 must not be a skeleton skip.");
}

const explicitAutomation = new Map();
for (const id of IDS) {
  const match = source.match(new RegExp(`\\[${id}\\]\\s+AUTOMATION:\\s+(FULL|PARTIAL|NONE)`));
  if (!match) fail(`${id} must declare [${id}] AUTOMATION: FULL|PARTIAL|NONE.`);
  explicitAutomation.set(id, match[1]);
}

const automatedIds = IDS.filter((id) => explicitAutomation.get(id) === "FULL");
const partialIds = IDS.filter((id) => explicitAutomation.get(id) === "PARTIAL");
const missingIds = IDS.filter((id) => explicitAutomation.get(id) === "NONE");

const banner = [
  "================================================================================",
  `CRITICAL JOURNEYS: ${automatedIds.length}/${IDS.length} FULL, ${partialIds.length}/${IDS.length} PARTIAL, ${missingIds.length}/${IDS.length} NONE.`,
  `Full: ${automatedIds.join(", ") || "(none)"}.`,
  `Partial: ${partialIds.join(", ") || "(none)"}.`,
  `None: ${missingIds.join(", ") || "(none)"}.`,
  "Payment → entitlement → activation → claim is not considered covered until its journey is marked FULL and runs in CI.",
  "A skipped Playwright test is not a pass.",
  "================================================================================",
].join("\n");

console.error(banner);
if (process.env.GITHUB_ACTIONS === "true" && (partialIds.length || missingIds.length)) {
  console.error(`::warning title=Critical journeys::FULL ${automatedIds.length}/${IDS.length}; PARTIAL ${partialIds.length}/${IDS.length}; NONE ${missingIds.length}/${IDS.length}.`);
}

console.log(`Critical journeys coverage: ${automatedIds.length}/${IDS.length} full.`);
