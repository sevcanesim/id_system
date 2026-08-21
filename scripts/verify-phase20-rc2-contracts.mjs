import fs from "node:fs";
import path from "node:path";

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

function walkTests(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTests(file, out);
    else if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) out.push(file);
  }
  return out;
}

const pkg = JSON.parse(read("package.json"));
const unit = [...walkTests("lib"), ...walkTests("app")].map(read).join("\n");
const wizard = read("app/olustur/CardWizard.tsx");
const client = read("app/kurumsal/panel/CorporatePanelClient.tsx");
const employees = read("app/kurumsal/panel/components/EmployeesPanel.tsx");

const checks = [
  ["package version is 25.8.61-rc.2 or later", versionAtLeast(pkg.version, "25.8.61")],
  ["unit tests do not inspect corporate page re-export shell", !unit.includes("app/kurumsal/panel/page.tsx")],
  ["unit tests do not require removed storefront.css", !unit.includes("app/storefront.css")],
  ["unit tests do not require removed brand-system.css", !unit.includes("app/brand-system.css")],
  ["corporate analytics implementation remains present", client.includes("loadCardAnalytics")],
  ["corporate seat packs implementation remains present", client.includes("seatPacks.map")],
  ["corporate bulk invite implementation remains present", client.includes("handleBulkInviteFile") && employees.includes("CSV ile Davet")],
  ["employee editor defers HR audit notice to save", wizard.includes("Değişiklikler İK ve Sistem Yöneticisine bildirildi") && !wizard.includes("Kendi bilgin · değişiklik İK kaydına düşer")],
  ["employee editor exposes rejected title request state", wizard.includes('titleRequest?.status === "REJECTED"')],
];
for (const [message, ok] of checks) ok ? pass(message) : fail(message);
if (!process.exitCode) console.log("\nPhase 20 RC2 contract reconciliation verification passed.");
