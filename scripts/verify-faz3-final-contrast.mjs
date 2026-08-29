import fs from "node:fs";

if (fs.existsSync("app/globals.css")) throw new Error("Retired app/globals.css must stay deleted.");
const css = ["app/canonical.css", "app/styles/canonical-public.css"].filter(fs.existsSync).map((file) => fs.readFileSync(file, "utf8")).join("\n");
const checks = [
  ["home footer copy contrast", ".yi-footer-brand p"],
  ["global CTA contrast", ".global-header-cta {"],
  ["auth mini-phone explicit label", ".p6-auth-page .p6-auth-mini-phone > small"],
  ["NFC kicker contrast", ".nfc-kicker"],
  ["NFC includes copy contrast", ".nfc-includes li"],
  ["corporate sidebar identity contrast", ".p10-corporate-platform .enterprise-side-user strong"],
];
let failed = false;
for (const [label, needle] of checks) {
  const ok = css.includes(needle);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("\nFAZ 3 final contrast contract passed.");
