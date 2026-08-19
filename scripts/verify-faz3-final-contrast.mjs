import fs from "node:fs";
// `accessibility-responsive.css` was consolidated into `globals.css` (see CHANGELOG.md,
// "cross-cutting ... layers moved into globals.css"); this gate was never repointed and
// crashed with ENOENT on every run. Fixed as part of the color/theme contrast pass.
const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const checks = [
  ["home footer explicit AA override", ".p4-public-home .yi-footer-brand p"],
  ["global CTA AA override", ".global-header-cta{"],
  ["auth mini-phone explicit label", ".p6-auth-page .p6-auth-mini-phone > small"],
  ["NFC story copy AA override", ".nfc-product-page .story-copy > p"],
  ["NFC story badge AA override", ".nfc-product-page .story-list article > span"],
  ["NFC story title AA override", ".nfc-product-page .story-list article > div > b"],
  ["NFC story description AA override", ".nfc-product-page .story-list article > div > p"],
  ["NFC domestic-order title AA override", ".nfc-product-page .domestic-order-note > strong"],
  ["NFC domestic-order copy AA override", ".nfc-product-page .domestic-order-note > p"],
];
let failed = false;
for (const [label, needle] of checks) {
  if (!css.includes(needle)) { console.error(`FAIL  ${label}`); failed = true; }
  else console.log(`PASS  ${label}`);
}
if (failed) process.exit(1);
console.log("\nFAZ 3 final contrast contract passed.");
