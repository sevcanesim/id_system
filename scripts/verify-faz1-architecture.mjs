import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const checks = [];
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  checks.push(ok);
}

const corporate = read("app/kurumsal/panel/CorporatePanelClient.tsx");
const overview = read("app/kurumsal/panel/components/OverviewPanel.tsx");
const header = read("app/components/AppHeader.tsx");
const dashboard = read("app/ui/DashboardShell.tsx");
const sidebar = read("app/components/ui/sidebar-config.ts");
const cards = read("app/kartlarim/page.tsx");
const card = read("app/kartim/page.tsx");
const states = read("app/components/ui/States.tsx");
const ds = read("app/components/ui/DesignSystem.tsx");
const hero = read("app/kurumsal/panel/components/CorporateHeroPreview.tsx");

const lines = corporate.split(/\r?\n/).length;
const useStates = (corporate.match(/useState/g) || []).length;
const fetches = (corporate.match(/fetch\(/g) || []).length;
console.log(`INFO  CorporatePanelClient metrics — ${lines} LOC, ${useStates} useState, ${fetches} fetch calls`);

check("corporate domain types extracted", corporate.includes('from "./domain/types"') && fs.existsSync("app/kurumsal/panel/domain/types.ts"));
check("template field normalization extracted", corporate.includes('from "./domain/template-fields"') && fs.existsSync("app/kurumsal/panel/domain/template-fields.ts"));
check(
  "corporate hero preview is explicit imported component",
  overview.includes('import CorporateHeroPreview from "./CorporateHeroPreview"') && overview.includes("<CorporateHeroPreview") && corporate.includes("<OverviewPanel"),
);
check("corporate hero preview renders real QR from slug", hero.includes("QRCode.toDataURL") && hero.includes("cardShareUrl"));
check("corporate panel has no duplicate global AppHeader", !corporate.includes("<AppHeader"));
check("corporate panel remains pathname-aware", corporate.includes("usePathname") && corporate.includes("tabRoutes"));
check(
  "/kartlarim remains dashboard/list intent",
  cards.includes("DashboardShell") && cards.includes("yi-dashboard-hero") && cards.includes("Kimliğin") && cards.includes("/kartim"),
);
check("/kartim remains card-detail intent", card.includes('title="Kartım"') && card.includes("p7-card-health"));
check(
  "individual and corporate panels share canonical sidebar config",
  sidebar.includes("export const INDIVIDUAL_SIDEBAR_CONFIG") &&
    sidebar.includes("export const CORPORATE_SIDEBAR_CONFIG") &&
    dashboard.includes("INDIVIDUAL_SIDEBAR_CONFIG") &&
    corporate.includes("<PanelSidebar") &&
    !header.includes("PanelSidebar"),
);
check("States EmptyState remains compatibility adapter", states.includes("DesignSystem") || states.includes("./DesignSystem"));
check("canonical DesignSystem still exports EmptyState", /export function EmptyState|export const EmptyState/.test(ds));
check("AppHeader stays a public SiteHeader wrapper", header.includes("SiteHeader") && !header.includes("organization_members"));
check(
  "individual dashboard resolves membership through the organizations API",
  cards.includes("/api/organizations/mine") && cards.includes('router.replace("/kurumsal/panel")'),
);

if (checks.some((v) => !v)) process.exit(1);
console.log("\nFAZ 1 architecture verification passed.");
