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

const skipTrueCount = (source.match(/test\.skip\(true/g) || []).length;
const automatedCount = IDS.length - skipTrueCount;
const skippedIds = IDS.filter((id) => {
  const start = source.indexOf(`test("${id}`);
  const next = IDS.map((other) => source.indexOf(`test("${other}`)).filter((index) => index > start);
  const end = next.length ? Math.min(...next) : source.length;
  return source.slice(start, end).includes("test.skip(true");
});
const automatedIds = IDS.filter((id) => !skippedIds.includes(id));

const banner = [
  "================================================================================",
  `CRITICAL JOURNEYS: ${automatedCount}/${IDS.length} automated. ${skippedIds.length}/${IDS.length} NOT AUTOMATED.`,
  `Automated: ${automatedIds.join(", ") || "(none)"}.`,
  `Not automated: ${skippedIds.join(", ") || "(none)"}.`,
  "Payment → entitlement → activation → claim is not covered by E2E.",
  "A skipped Playwright test is not a pass.",
  "Sandbox E2E-03 (duplicate callback) and E2E-05 (authenticated auto-claim) still need iyzico CI secrets.",
  "================================================================================",
].join("\n");

console.error(banner);
if (process.env.GITHUB_ACTIONS === "true") {
  console.error(`::warning title=Critical journeys::${skippedIds.length}/${IDS.length} critical journeys are NOT automated. Only ${automatedIds.join(", ") || "none"} run.`);
}

if (skipTrueCount < 1) {
  // If every journey is automated, the banner still prints; do not fail.
  console.error("Critical journeys coverage: all named journeys appear automated.");
}

console.log(`Critical journeys coverage: ${automatedCount}/${IDS.length} automated.`);
