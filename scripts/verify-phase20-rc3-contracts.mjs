import fs from "node:fs";

const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => {
  console.error(`FAIL  ${message}`);
  process.exitCode = 1;
};
const read = (file) => fs.readFileSync(file, "utf8");

function versionAtLeast(version, baseline) {
  const parse = (value) => String(value).replace(/-.*$/, "").split(".").map((part) => Number(part) || 0);
  const current = parse(version);
  const min = parse(baseline);
  for (let i = 0; i < 3; i++) {
    if (current[i] > min[i]) return true;
    if (current[i] < min[i]) return false;
  }
  return true;
}

const pkg = JSON.parse(read("package.json"));
const states = read("app/components/ui/States.tsx");
const skeleton = read("app/components/ui/DesignSystem.tsx");
const login = read("app/giris/page.tsx") + read("app/giris/LoginClient.tsx");
const shell = read("app/components/ui/AppShell.tsx");
const client = read("app/kurumsal/panel/CorporatePanelClient.tsx");
const employees = read("app/kurumsal/panel/components/EmployeesPanel.tsx");
const css = read("app/canonical.css");
const bulkInvite = read("lib/organizations/bulk-invite.ts");

const checks = [
  ["package version is 25.8.62 or later", versionAtLeast(pkg.version, "25.8.62")],
  ["loading-state follows canonical Skeleton primitive", states.includes("<Skeleton") && skeleton.includes("export function Skeleton") && css.includes("@keyframes ds-skeleton-shimmer")],
  ["business portal follows dynamic portal destination", login.includes('setReturnPath(nextPortal === "business" ? "/kurumsal/panel" : "/kartlarim")')],
  ["support-message follows shared AppShell mail channel", shell.includes('aria-label="Destek ekibine e-posta gönder"')],
  ["corporate route sync follows canonical path map", client.includes("router.push(tabRoutes[tab])") && client.includes("/kurumsal/panel/ayarlar")],
  ["bulk invite preview renders a real accessible table", employees.includes("p11-bulk-invite-table") && employees.includes('aria-label="Toplu davet önizlemesi"') && employees.includes("bulkInvitePreview.rows.slice(0, 12)")],
  ["bulk invite table has bounded responsive ownership", css.includes(".p11-bulk-invite-table") && css.includes("overflow-x: auto") && css.includes("min-width: 760px")],
  ["bulk invite domain parser remains present", bulkInvite.includes("export function parseBulkInviteCsv")],
];
for (const [message, ok] of checks) ok ? pass(message) : fail(message);
if (!process.exitCode) console.log("\nPhase 20 RC3 final unit-contract verification passed.");
