import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
function check(label, ok) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  checks.push(ok);
}

const panel =
  read("app/kurumsal/panel/CorporatePanelClient.tsx") +
  read("app/kurumsal/panel/components/EmployeesPanel.tsx") +
  read("app/kurumsal/panel/components/EmployeeDrawer.tsx") +
  read("app/kurumsal/panel/components/OverviewPanel.tsx") +
  read("app/kurumsal/panel/components/TemplatesPanel.tsx");
const templates = read("app/kurumsal/panel/components/TemplatesPanel.tsx");
const staging = read(".github/workflows/staging-integration.yml");
const production = read(".github/workflows/production-deploy.yml");

check(
  "corporate template preview is defined and rendered",
  templates.includes("function TemplatesPanel") && templates.includes("CardPreviewFrame"),
);
check(
  "corporate template preview renders the live branded card",
  templates.includes("CardTemplate") && panel.includes("previewBranding"),
);
check(
  "pre-deploy gate verifies production schema without staging mutation",
  staging.includes("npm run verify:release") &&
    staging.includes("npm run verify:migration-drift") &&
    staging.includes("npm run verify:db") &&
    staging.includes("npm run verify:catalog") &&
    staging.includes("PRODUCTION_SUPABASE_PROJECT_REF") &&
    !staging.includes("npm run verify:phase20:staging") &&
    !staging.includes("ALLOW_STAGING_MUTATIONS"),
);
check(
  "production deploy is blocked by staging and canonical production gate",
  production.includes("needs: staging-gate") &&
    production.includes("environment: production") &&
    production.includes("npm run verify:phase20:production") &&
    production.includes("deploy --prebuilt --prod"),
);

if (checks.some((ok) => !ok)) process.exit(1);
console.log("\nFAZ 1 regression verification passed.");
