import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => { failed++; console.error(`FAIL  ${message}`); };
const check = (ok, message) => ok ? pass(message) : fail(message);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const LIVE_OWNED_CSS = [
  "app/canonical.css",
  "app/design-tokens.css",
  "app/design-system.css",
  "app/employee-management.css",
  "app/theme-policy.css",
];

for (const file of [
  "docs/LEGACY_REMOVAL_PHASE14_V25.8.55.md",
  "audit/PHASE14_LEGACY_REMOVAL_AUDIT.json",
  ...LIVE_OWNED_CSS,
]) check(exists(file), `phase14 live artifact exists: ${file}`);

for (const file of [
  "app/panel-system.css",
  "app/profile-editor.css",
  "app/corporate-platform.css",
  "app/dashboard-flow.css",
  "app/public-card.css",
  "app/globals.css",
  "app/legacy-surfaces.css",
  "app/qr.css",
]) check(!exists(file), `${file} remains retired`);

const layout = read("app/layout.tsx");
const css = read("app/canonical.css");
const kart = read("app/kartim/page.tsx");
const wizard = read("app/olustur/CardWizard.tsx");
const pub = read("app/components/security/PublicProfileProtection.tsx");
const phase14Doc = read("docs/LEGACY_REMOVAL_PHASE14_V25.8.55.md");
const audit = JSON.parse(read("audit/PHASE14_LEGACY_REMOVAL_AUDIT.json"));

check(layout.includes('import "./canonical.css";'), "canonical stylesheet is globally loaded");
check(layout.includes('import "./design-tokens.css";') && layout.includes('import "./design-system.css";'), "owned token and design-system layers remain imported");
check(!layout.includes("panel-system.css"), "root layout no longer imports panel-system.css");
check(!layout.includes("profile-editor.css"), "root layout no longer imports profile-editor.css");
check(!layout.includes("dashboard-flow.css") && !layout.includes("public-card.css") && !layout.includes("legacy-surfaces.css") && !layout.includes("globals.css"), "retired split stylesheets stay out of root layout");
check(!/--yp-/.test(css), "obsolete yp token aliases removed from canonical CSS");
check(css.includes(".p14-card-shell"), "Kartım chrome lives in canonical.css");
check(!/\byp-/.test(kart), "Kartım no longer uses yp classes");
check(!/dashboard-(?:shell|main|status|preview|link|copy|action|grid|panel|message)/.test(kart), "Kartım migrated off legacy dashboard selectors");
check(!wizard.includes("HESAP KONTROLÜ"), "visible account-check loading surface removed");
check(!/individual-(?:nav|sidebar-spacer)/.test(wizard), "corporate editor no longer depends on individual nav selectors");
check(wizard.includes("PageLoadingView"), "profile editor uses canonical view loading state");
check(pub.includes("p12-profile-watermark"), "public watermark remains on the public card surface");
check(phase14Doc.includes("app/canonical.css") && !phase14Doc.includes("Kartım visual ownership -> `dashboard-flow.css`"), "Phase 14 doc does not keep split dashboard CSS as the live surface");
check(phase14Doc.includes("design-tokens.css") && phase14Doc.includes("must not be deleted"), "Phase 14 doc keeps design-tokens.css as live owned CSS");
check(Array.isArray(audit.liveOwnedCss) && LIVE_OWNED_CSS.every((file) => audit.liveOwnedCss.includes(file)), "Phase 14 audit lists the live owned CSS set");
check(!(audit.removed || []).includes("app/design-tokens.css") && !(audit.removed || []).includes("app/design-system.css"), "Phase 14 audit does not list design-tokens or design-system as removed");
check(Array.isArray(audit.remainingLegacyOwners) && audit.remainingLegacyOwners.length === 0, "Phase 14 audit no longer treats deleted split CSS as remaining owners");

for (const file of ["app/p/[publicId]/page.tsx", "app/c/[cardCode]/page.tsx", "app/[slug]/page.tsx"]) {
  check(!read(file).includes("qr.css"), `public route no longer imports qr.css: ${file}`);
}

const tsx = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith(".tsx")) tsx.push(fs.readFileSync(file, "utf8"));
  }
};
walk(path.join(root, "app"));
const source = tsx.join("\n");
check(!/className=["'`][^"'`]*\bindividual-[A-Za-z]/.test(source), "no individual-* legacy CSS classes remain in TSX");
check(!/var\(--(?:yp)-/.test(source), "no yp legacy token references remain in TSX");

const pkg = JSON.parse(read("package.json"));
const versionMatch = String(pkg.version || "").match(/^(\d+)\.(\d+)\.(\d+)/);
const baseline = [25, 8, 55];
const current = versionMatch ? versionMatch.slice(1).map(Number) : null;
const versionAtLeastBaseline = Boolean(current) && (
  current[0] > baseline[0]
  || (current[0] === baseline[0] && (current[1] > baseline[1] || (current[1] === baseline[1] && current[2] >= baseline[2])))
);
check(versionAtLeastBaseline, "package version retains Phase 14 legacy removal or later");
check(pkg.scripts?.["verify:phase14:legacy"] === "node scripts/verify-phase14-legacy-removal.mjs", "phase14 verifier registered");

if (failed) {
  console.error(`\nPhase 14 legacy removal verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nPhase 14 legacy removal verification passed.");
