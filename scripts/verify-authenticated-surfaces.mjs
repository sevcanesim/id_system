import fs from "node:fs";

const checks = [
  ["app/ui/DashboardShell.tsx", ["PanelSidebar", "INDIVIDUAL_SIDEBAR_CONFIG"]],
  ["app/components/ui/AnalyticsTrendChart.tsx", ["AnalyticsTrendPoint", "preserveAspectRatio"]],
  ["app/istatistikler/page.tsx", ["AnalyticsTrendChart", "observedDays"]],
  ["app/siparislerim/page.tsx", ["normalizeShippingAddress", "OrdersPage.module.css"]],
  ["app/ayarlar/page.tsx", ["accountMessage", "securityMessage"]],
  ["app/kartlarim/page.tsx", ["PageState", "redirecting"]],
];

let failed = false;
for (const [file, needles] of checks) {
  const source = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`FAIL — ${file} missing ${needle}`);
      failed = true;
    }
  }
  if (source.includes("<<<<<<<") || source.includes(">>>>>>>")) {
    console.error(`FAIL — ${file} contains merge conflict markers`);
    failed = true;
  }
}

if (fs.existsSync("app/components/IndividualSidebar.tsx")) {
  console.error("FAIL — IndividualSidebar compatibility wrapper must be removed");
  failed = true;
}

if (!failed) console.log("PASS — authenticated surface contracts verified");
process.exitCode = failed ? 1 : 0;
