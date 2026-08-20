import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed++; console.log(`FAIL  ${m}`); };
const check = (ok, m) => ok ? pass(m) : fail(m);
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const required = [
  "app/canonical.css",
  "app/LandingClient.tsx",
  "docs/PUBLIC_CONVERSION_PHASE4_V25.8.44.md",
  "audit/PHASE4_PUBLIC_CONVERSION_AUDIT.json",
];
for (const file of required) check(fs.existsSync(path.join(root, file)), `phase4 artifact exists: ${file}`);

const css = read("app/canonical.css");
const landing = read("app/LandingClient.tsx");
const layout = read("app/layout.tsx");
const header = read("app/ui/SiteHeader.tsx");
const pkg = JSON.parse(read("package.json"));

const publicLayoutOwners = ["app/page.tsx","app/urunler/layout.tsx","app/kurumsal/layout.tsx"];
check(layout.includes('import "./canonical.css";'), "canonical CSS is owned by the root layout");
check(!layout.includes('import "./public-conversion.css";'), "retired public conversion stylesheet is not imported globally");
for (const owner of publicLayoutOwners) check(!read(owner).includes("public-conversion.css"), `retired public conversion CSS is absent from ${owner}`);
check(css.includes(".p4-public-home"), "public conversion surface is explicitly scoped");
check(!/--(?:yi|yp|store|brand|ui|y)-/.test(css), "Phase 4 CSS introduces no legacy token family");
check(!/var\(--(?:yi|yp|store|brand|ui|y)-/.test(css), "Phase 4 public CSS remains on canonical tokens");
check(css.includes("prefers-reduced-motion"), "Phase 4 public CSS retains motion accessibility contract");
check(!/style=\{\{/.test(landing), "Phase 4 landing has no inline style objects");

const requiredSections = [
  "p4-hero", "p4-proof", "p4-benefit-grid", "nasil-calisir", "p4-path-grid", "p4-faq-layout", "p4-final"
];
for (const token of requiredSections) check(landing.includes(token), `homepage conversion section present: ${token}`);

check(landing.includes("Fiziksel kart. Dijital profil. Tek sistem.") && landing.includes("Fiziksel NFC + QR kart"), "homepage explains physical + digital product model");
check(landing.includes("Kart → NFC → Profil"), "hero visually states card-to-profile interaction");
check(landing.includes("Bireysel") && landing.includes("Kurumsal"), "individual/corporate discovery split is explicit");
check(landing.includes("1 yıl dijital hizmet dahil") && landing.includes("Ücretsiz kargo") && landing.includes("Güvenli kayıp modu"), "trust/value layer covers service, delivery and lost-card safety");
check(
  header.includes('"Dijital Kartvizit"') &&
  header.includes('"Nasıl Çalışır"') &&
  header.includes('"Kurumsal Çözümler"') &&
  header.includes('"Yardım Merkezi"'),
  "public navigation matches live Digital ID IA",
);
check(header.includes('"/giris"') && header.includes('"NFC Kartı Satın Al"'), "landing header preserves login + primary product CTA");
check(!header.includes('{menuOpen ? "×" : "☰"}'), "mobile navigation no longer uses menu glyphs");
check(css.includes("@media (max-width: 760px)") && css.includes("@media (max-width: 430px)"), "mobile responsive rules cover 760px and 430px contexts");
check(css.includes("min-height:48px") || css.includes("--touch-target"), "primary mobile actions meet touch-target intent");
check(css.includes("prefers-reduced-motion"), "reduced motion accessibility supported");
const versionMatch = String(pkg.version || "").match(/^(\d+)\.(\d+)\.(\d+)/);
const versionTuple = versionMatch ? versionMatch.slice(1).map(Number) : [0, 0, 0];
const atLeastPhase4 = versionTuple[0] > 25 || (versionTuple[0] === 25 && (versionTuple[1] > 8 || (versionTuple[1] === 8 && versionTuple[2] >= 44)));
check(atLeastPhase4, "package version retains Phase 4 public conversion or later");
check(pkg.scripts?.["verify:phase4:public"] === "node scripts/verify-phase4-public-conversion.mjs", "phase4 verifier script registered");

if (failed) {
  console.error(`\nPhase 4 public conversion verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nPhase 4 public conversion verification passed.");
