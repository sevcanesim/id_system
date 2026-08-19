import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = false;
const check = (ok, message) => {
  if (ok) console.log(`PASS  ${message}`);
  else { failed = true; console.error(`FAIL  ${message}`); }
};
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const router = read("lib/auth/account-router.ts");
const guard = read("lib/auth/portal-guard.ts");
const shell = read("app/ui/DashboardShell.tsx");
const wizard = read("app/olustur/CardWizard.tsx");
const publicProfile = read("app/p/[publicId]/page.tsx");
const packageJson = JSON.parse(read("package.json"));

check(router.includes('from("user_accounts")') && router.includes('account_type'), "account router uses canonical account type");
check(router.includes('account.account_type === "CORPORATE"') && router.includes('account.account_type === "INDIVIDUAL"'), "normal accounts have deterministic portal destinations");
check(router.includes('ACCOUNT_ROUTE_EMPLOYEE = "/kartim"') && router.includes("hasManagementOrganization"), "corporate employees land on Kartım instead of the management panel");
check(guard.includes('from("user_accounts")') && guard.includes("isPortalAllowed"), "portal guard validates the selected portal against account type");
check(guard.includes("validateCardWorkspace") && guard.includes("canUseCardWorkspace"), "card workspace allows corporate employees after business login");
check(shell.includes("validatePortal") && shell.includes("validateCardWorkspace") && shell.includes('portal="individual"'), "individual shell validates portal before rendering");
check(shell.includes("INDIVIDUAL_SIDEBAR_CONFIG"), "individual shell consumes shared sidebar config");
check(wizard.includes("isBusinessCard") && wizard.includes("/kurumsal/panel"), "shared create workflow preserves corporate context");
check(publicProfile.includes("PublicProfileProtection") || publicProfile.includes("generateStaticParams"), "public profile remains an explicit public route surface");
check(!shell.includes("PanelSidebar"), "individual shell does not import the corporate sidebar");
check(packageJson.scripts?.["verify:portal-context"] === "node scripts/verify-portal-context.mjs", "portal context verifier is registered");

if (failed) process.exit(1);
console.log("\nPortal context architecture verification passed.");
