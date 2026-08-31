import fs from "node:fs";

const canonicalPath = "app/styles/canonical-corporate.css";
const rootLayoutPath = "app/layout.tsx";
const corporateLayoutPath = "app/kurumsal/layout.tsx";
const panelLayoutPath = "app/kurumsal/panel/layout.tsx";
const legacyFiles = [
  "app/kurumsal/panel/analytics-polish.css",
  "app/kurumsal/panel/shell-chrome-fix.css",
  "app/kurumsal/panel/organization-structure-polish.css",
  "app/kurumsal/panel/sidebar-footer-fix.css",
];

let canonical = fs.readFileSync(canonicalPath, "utf8").trimEnd();
for (const legacyPath of legacyFiles) {
  if (!fs.existsSync(legacyPath)) continue;
  const legacy = fs.readFileSync(legacyPath, "utf8").trim();
  if (legacy) {
    canonical += `\n\n/* Migrated from ${legacyPath}; corporate domain ownership. */\n${legacy}`;
  }
  fs.rmSync(legacyPath);
}
fs.writeFileSync(canonicalPath, `${canonical}\n`);

let rootLayout = fs.readFileSync(rootLayoutPath, "utf8");
const rootImport = 'import "./styles/canonical-corporate.css";\n';
if (!rootLayout.includes(rootImport)) throw new Error("Root canonical corporate import not found");
rootLayout = rootLayout.replace(rootImport, "");
fs.writeFileSync(rootLayoutPath, rootLayout);

let corporateLayout = fs.readFileSync(corporateLayoutPath, "utf8");
const corporateImport = 'import "../styles/canonical-corporate.css";';
if (!corporateLayout.includes(corporateImport)) {
  corporateLayout = corporateLayout.replace(
    'import type { Metadata } from "next";\n',
    'import type { Metadata } from "next";\nimport "../styles/canonical-corporate.css";\n',
  );
}
fs.writeFileSync(corporateLayoutPath, corporateLayout);

let panelLayout = fs.readFileSync(panelLayoutPath, "utf8");
for (const legacyPath of legacyFiles) {
  const name = legacyPath.split("/").at(-1);
  panelLayout = panelLayout.replace(`import "./${name}";\n`, "");
}
fs.writeFileSync(panelLayoutPath, panelLayout);

fs.rmSync("scripts/apply-corporate-css-consolidation.mjs");
console.log("Corporate CSS consolidated into app/styles/canonical-corporate.css");
