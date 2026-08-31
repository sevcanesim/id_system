import fs from "node:fs";

const checks = [
  ["app/ui/DashboardShell.tsx", ["PanelSidebar", "INDIVIDUAL_SIDEBAR_CONFIG"]],
  ["app/kurumsal/panel/IDSidebar.tsx", ["PanelSidebar", 'scope="corporate"']],
  ["app/components/ui/AnalyticsTrendChart.tsx", ["AnalyticsTrendPoint", "preserveAspectRatio"]],
  ["app/istatistikler/page.tsx", ["AnalyticsTrendChart", "observedDays"]],
  ["app/kurumsal/panel/components/AnalyticsPanel.tsx", ["AnalyticsTrendChart"]],
  ["app/hooks/useProfileCardActions.ts", ["copyLink", "shareLink", "downloadQr", "togglePublished", "toggleLostMode"]],
  ["app/kartim/page.tsx", ["useProfileCardActions", "MyCardPage.module.css"]],
  ["app/olustur/CardWizard.tsx", ["useProfileCardActions", "profileCardActions.copyLink"]],
  ["app/siparislerim/page.tsx", ["normalizeShippingAddress", "OrdersPage.module.css"]],
  ["app/ayarlar/page.tsx", ["accountMessage", "securityMessage", 'enterKeyHint="done"']],
  ["app/kartlarim/page.tsx", ["PageState", "redirecting"]],
  ["app/aktivasyon/ActivationClient.tsx", ["activationMessage", "resendMessage", 'role="tablist"']],
  ["app/kurumsal/panel/CorporatePanelClient.tsx", ["useCorporatePanelLazyData", "loadDataForTab(currentTab"]],
  ["app/kurumsal/panel/hooks/useCorporatePanelLazyData.ts", ["loadedDataRef", "inFlightDataRef", "corporatePanelDataResources"]],
  ["app/kurumsal/panel/domain/tab-data.ts", ["CorporatePanelDataResource", "TAB_DATA_RESOURCES"]],
  ["app/kurumsal/panel/components/RolesPanel.tsx", ["RolesPanel.module.css", "mobileMatrix"]],
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

for (const legacy of [
  "app/components/IndividualSidebar.tsx",
  "app/kurumsal/panel/analytics-polish.css",
  "app/kurumsal/panel/shell-chrome-fix.css",
  "app/kurumsal/panel/organization-structure-polish.css",
  "app/kurumsal/panel/sidebar-footer-fix.css",
]) {
  if (fs.existsSync(legacy)) {
    console.error(`FAIL — legacy file still exists: ${legacy}`);
    failed = true;
  }
}

const corporateClient = fs.readFileSync("app/kurumsal/panel/CorporatePanelClient.tsx", "utf8");
if (corporateClient.includes("waitForInitialPanelLoads")) {
  console.error("FAIL — corporate panel still uses aggregate initial loader");
  failed = true;
}

for (const cssModule of [
  "app/components/ui/AnalyticsTrendChart.module.css",
  "app/kartim/MyCardPage.module.css",
  "app/siparislerim/OrdersPage.module.css",
  "app/kurumsal/panel/components/RolesPanel.module.css",
]) {
  const source = fs.readFileSync(cssModule, "utf8");
  if (source.includes("!important")) {
    console.error(`FAIL — ${cssModule} introduces !important`);
    failed = true;
  }
}

if (!failed) console.log("PASS — authenticated surface contracts verified");
process.exitCode = failed ? 1 : 0;
