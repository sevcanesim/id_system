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
  read("app/kurumsal/panel/components/CorporateHeroPreview.tsx");
const hero = read("app/kurumsal/panel/components/CorporateHeroPreview.tsx");
const staging = read(".github/workflows/staging-integration.yml");
const production = read(".github/workflows/production-deploy.yml");

check(
  "CorporateHeroPreview is defined and imported",
  hero.includes("function CorporateHeroPreview") &&
    read("app/kurumsal/panel/CorporatePanelClient.tsx").includes(
      'import CorporateHeroPreview from "./components/CorporateHeroPreview"',
    ),
);
check(
  "corporate hero renders a real QR from slug",
  hero.includes("QRCode.toDataURL") && panel.includes("representativeCard?.slug"),
);
check(
  "staging isolation runs before canonical staging promotion",
  staging.indexOf("Prove database isolation before mutation") > -1 &&
    staging.indexOf("Prove database isolation before mutation") <
      staging.indexOf("Verify RC3 staging promotion contract") &&
    staging.includes("npm run verify:phase20:staging"),
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
