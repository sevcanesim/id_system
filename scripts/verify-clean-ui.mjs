import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const app = path.join(root, "app");
const uiRoot = path.join(app, "ui");
const files = fs.readdirSync(uiRoot).filter((file) => /\.(tsx?|css)$/.test(file));
const source = files.filter((file) => !file.endsWith(".css")).map((file) => fs.readFileSync(path.join(uiRoot, file), "utf8")).join("\n");
const canonicalPath = path.join(app, "canonical.css");
const css = fs.existsSync(canonicalPath) ? fs.readFileSync(canonicalPath, "utf8") : "";

const rootLayout = fs.readFileSync(path.join(app, "layout.tsx"), "utf8");
const panelLayout = fs.readFileSync(path.join(app, "kurumsal", "panel", "layout.tsx"), "utf8");
const CORPORATE_PANEL_CSS = [
  "employee-action-first.css",
  "overview-polish.css",
  "template-studio.css",
  "card-inventory-separation.css",
  "networking-inbox.css",
  "corporate-consistency-pass.css",
  "premium-ui-pass.css",
  "team-management.css",
  "content-history-polish.css",
  "content-layout-v2.css",
];

const failures = [];
if (source.includes("!important")) failures.push("app/ui contains !important");
if (source.includes("style={{")) failures.push("app/ui contains inline React styles");
if (css.includes("!important")) failures.push("canonical.css contains !important");
if (!css.includes(":root")) failures.push("canonical token root missing");
if (!fs.existsSync(path.join(root, "supabase", "migrations"))) failures.push("Supabase migrations missing");

const migrations = fs.readdirSync(path.join(root, "supabase", "migrations")).filter((file) => file.endsWith(".sql"));
if (migrations.length < 1) failures.push("No Supabase migrations found");

const cssFiles = [];
function walkCss(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCss(file);
    else if (/\.(css|scss|sass|less)$/.test(entry.name)) cssFiles.push(path.relative(root, file).replaceAll("\\", "/"));
  }
}
walkCss(app);
cssFiles.sort();
const misplacedPanelCss = CORPORATE_PANEL_CSS.filter((file) =>
  rootLayout.includes(`./kurumsal/panel/${file}`),
);
const missingPanelCss = CORPORATE_PANEL_CSS.filter((file) =>
  !panelLayout.includes(`./${file}`),
);
if (misplacedPanelCss.length) {
  failures.push("corporate-panel styles must not be imported by the public root layout");
}
if (missingPanelCss.length) {
  failures.push("corporate-panel layout must own each corporate-panel stylesheet");
}

const result = {
  files,
  cssBytes: Buffer.byteLength(css),
  importantCount: (css.match(/!important/g) || []).length,
  inlineStyleCount: (source.match(/style=\{\{/g) || []).length,
  migrationCount: migrations.length,
  cssFiles,
  misplacedPanelCss,
  missingPanelCss,
  status: failures.length ? "FAIL" : "PASS",
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length ? 1 : 0;
