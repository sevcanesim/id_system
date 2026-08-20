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
  "app/page.tsx",
  "docs/PUBLIC_CONVERSION_PHASE4_V25.8.44.md",
  "audit/PHASE4_PUBLIC_CONVERSION_AUDIT.json",
];
for (const file of required) check(fs.existsSync(path.join(root, file)), `phase4 artifact exists: ${file}`);
check(!fs.existsSync(path.join(root, "app/LandingClient.tsx")), "retired LandingClient artifact stays deleted");
check(!fs.existsSync(path.join(root, "app/public-conversion.css")), "retired public-conversion.css stays deleted");

const css = read("app/canonical.css");
const landing = read("app/page.tsx");
const layout = read("app/layout.tsx");
const header = read("app/ui/SiteHeader.tsx");
const how = read("app/nasil-calisir/page.tsx");
const audit = JSON.parse(read("audit/PHASE4_PUBLIC_CONVERSION_AUDIT.json"));
const phase4Doc = read("docs/PUBLIC_CONVERSION_PHASE4_V25.8.44.md");
const pkg = JSON.parse(read("package.json"));

const publicLayoutOwners = ["app/page.tsx", "app/urunler/layout.tsx", "app/kurumsal/layout.tsx"];
check(layout.includes('import "./canonical.css";'), "canonical CSS is owned by the root layout");
check(!layout.includes('import "./public-conversion.css";'), "retired public conversion stylesheet is not imported globally");
for (const owner of publicLayoutOwners) check(!read(owner).includes("public-conversion.css"), `retired public conversion CSS is absent from ${owner}`);
check(css.includes(".home-mockup") && css.includes(".home-premium"), "live homepage chrome lives in canonical.css");
check(!/--(?:yi|yp|store|brand|ui|y)-/.test(css), "Phase 4 CSS introduces no legacy token family");
check(!/var\(--(?:yi|yp|store|brand|ui|y)-/.test(css), "Phase 4 public CSS remains on canonical tokens");
check(css.includes("prefers-reduced-motion"), "Phase 4 public CSS retains motion accessibility contract");
check(!/style=\{\{/.test(landing), "live homepage has no inline style objects");
check(audit.canonicalSurface === "app/page.tsx", "Phase 4 audit points at the live homepage");
check(phase4Doc.includes("app/page.tsx") && !phase4Doc.includes("LandingClient is the live"), "Phase 4 doc does not keep LandingClient as the live surface");

check(landing.includes("home-mockup__hero"), "homepage conversion section present: hero");
check(landing.includes("home-premium__proof"), "homepage conversion section present: proof");
check(landing.includes("home-premium__path-grid"), "homepage conversion section present: individual/corporate split");
check(landing.includes("home-premium__journey") && landing.includes('href="/nasil-calisir"'), "homepage conversion section present: how it works");
check(landing.includes("home-premium__final"), "homepage conversion section present: final CTA");
check(how.includes("how-it-works-page") && how.includes("Kaybolursa kapat"), "dedicated how-it-works page retains lost-mode and share steps");

check(landing.includes("Fiziksel NFC + QR") && landing.includes("Kartın fiziksel"), "homepage explains physical + digital product model");
check(landing.includes("YenomiProductVisual") && landing.includes('variant="card"') && landing.includes('variant="profile"'), "hero shows physical card and live profile specimens");
check(landing.includes("BİREYSEL") && landing.includes("KURUMSAL"), "individual/corporate discovery split is explicit");
check(landing.includes("KAYIP MODU") && landing.includes("Kaybolursa kapanır"), "lost mode remains visible on the public homepage");
check(landing.includes("Hesap açmadan ödeyebilirsin") && landing.includes("Kart numarası Yenomi’de saklanmaz"), "guest checkout and card-number privacy stay explicit");
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
check(css.includes("min-height:48px") || css.includes("min-height:50px") || css.includes("--touch-target"), "primary mobile actions meet touch-target intent");
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
