import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = false;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed = true; console.log(`FAIL  ${m}`); };
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

for (const p of [
  "app/canonical.css",
  "app/ui/DashboardShell.tsx",
  "app/components/UserPanelShell.tsx",
  "app/components/ui/sidebar-config.ts",
  "app/kartlarim/page.tsx",
  "app/kartim/page.tsx",
  "app/istatistikler/page.tsx",
  "app/siparislerim/page.tsx",
  "app/yenile/page.tsx",
  "app/ayarlar/page.tsx",
  "docs/INDIVIDUAL_DASHBOARD_PHASE7_V25.8.47.md",
  "audit/PHASE7_INDIVIDUAL_DASHBOARD_AUDIT.json",
]) exists(p) ? pass(`phase7 artifact exists: ${p}`) : fail(`phase7 artifact exists: ${p}`);

exists("app/dashboard-flow.css") ? fail("retired dashboard-flow.css stays deleted") : pass("retired dashboard-flow.css stays deleted");

const layout = read("app/layout.tsx");
const home = read("app/kartlarim/page.tsx");
const css = read("app/canonical.css");
const shell = read("app/ui/DashboardShell.tsx");
const compat = read("app/components/UserPanelShell.tsx");
const individualNav = read("app/components/ui/sidebar-config.ts");
const audit = JSON.parse(read("audit/PHASE7_INDIVIDUAL_DASHBOARD_AUDIT.json"));
const phase7Doc = read("docs/INDIVIDUAL_DASHBOARD_PHASE7_V25.8.47.md");

!layout.includes("dashboard-flow.css") && !home.includes("dashboard-flow.css")
  ? pass("dashboard chrome is owned by canonical.css, not a split dashboard stylesheet")
  : fail("dashboard chrome is owned by canonical.css, not a split dashboard stylesheet");
css.includes(".p7-card-health") && css.includes(".yi-app--individual") && css.includes(".yi-dashboard-hero")
  ? pass("canonical CSS covers individual dashboard surfaces")
  : fail("canonical CSS covers individual dashboard surfaces");
audit.canonicalShell === "app/ui/DashboardShell.tsx" ? pass("Phase 7 audit points at DashboardShell") : fail("Phase 7 audit points at DashboardShell");
phase7Doc.includes("DashboardShell") && !phase7Doc.includes("lives in `dashboard-flow.css`")
  ? pass("Phase 7 doc does not keep dashboard-flow.css as the live surface")
  : fail("Phase 7 doc does not keep dashboard-flow.css as the live surface");

individualNav.includes("export const INDIVIDUAL_SIDEBAR_CONFIG")
  && individualNav.includes('group: "KİMLİK"')
  && individualNav.includes('group: "İÇGÖRÜLER"')
  && individualNav.includes('group: "HESAP"')
  ? pass("individual navigation has Identity / Insights / Account hierarchy")
  : fail("individual navigation hierarchy");
shell.includes("INDIVIDUAL_SIDEBAR_CONFIG") ? pass("DashboardShell consumes shared individual sidebar config") : fail("DashboardShell consumes shared individual sidebar config");
shell.includes('aria-current={pathname===href||pathname.startsWith(`${href}/`)?"page":undefined}')
  || shell.includes('aria-current={pathname===href')
  ? pass("active navigation is exposed accessibly")
  : fail("active navigation accessibility");
compat.includes("<DashboardShell") ? pass("UserPanelShell reduced to DashboardShell compatibility wrapper") : fail("UserPanelShell compatibility migration");
!home.includes("style={{") ? pass("dashboard home removes inline layout styling") : fail("dashboard home removes inline layout styling");
home.includes("<progress") && home.includes("yi-dashboard-hero") && home.includes("Kimliğin")
  ? pass("dashboard home prioritizes identity status, completion and account actions")
  : fail("dashboard home information hierarchy");

const card = read("app/kartim/page.tsx");
card.includes("p7-card-health") ? pass("Kartım exposes profile / physical card / publication health") : fail("Kartım health summary");
card.includes("window.confirm") && card.includes("fiziksel kart üzerinden profil erişimini durduracaktır")
  ? pass("lost mode has explicit destructive confirmation")
  : fail("lost mode confirmation");
card.includes("QR İndir") && card.includes("Bağlantıyı Paylaş") ? pass("Kartım retains QR and share actions") : fail("Kartım QR/share actions");

const settings = read("app/ayarlar/page.tsx");
settings.includes("<Field") && settings.includes("<Input") && settings.includes("Button")
  ? pass("settings migrated to canonical form/button primitives")
  : fail("settings canonical primitives");
const renewal = read("app/yenile/page.tsx");
renewal.includes("<Badge") && renewal.includes("<Card") ? pass("subscription migrated to canonical Card/Badge primitives") : fail("subscription canonical primitives");
const analytics = read("app/istatistikler/page.tsx");
analytics.includes("<Card") && analytics.includes("<EmptyState") ? pass("analytics migrated to canonical Card/EmptyState primitives") : fail("analytics canonical primitives");

css.includes("@media(max-width:640px)") && (css.includes("@media(max-width:900px)") || css.includes("@media (max-width: 760px)"))
  ? pass("dashboard responsive rules cover tablet and mobile")
  : fail("dashboard responsive coverage");
css.includes("prefers-reduced-motion") ? pass("dashboard supports reduced motion") : fail("dashboard reduced motion");
exists(".env.example") ? pass("baseline .env.example restored to source package") : fail("baseline .env.example restored to source package");

const compareVersion = (a, b) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
};
const pkg = JSON.parse(read("package.json"));
compareVersion(pkg.version, "25.8.47") >= 0 ? pass("package version retains Phase 7 dashboard or later") : fail("package version retains Phase 7 dashboard or later");
pkg.scripts?.["verify:phase7:dashboard"] ? pass("phase7 verifier script registered") : fail("phase7 verifier script registered");

let balance = 0;
for (const ch of css) {
  if (ch === "{") balance++;
  if (ch === "}") balance--;
}
balance === 0 ? pass("CSS brace balance: app/canonical.css") : fail("CSS brace balance: app/canonical.css");

if (failed) process.exit(1);
console.log("\nPhase 7 individual dashboard verification passed.");
