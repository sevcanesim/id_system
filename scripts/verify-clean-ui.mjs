import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const app = path.join(root, "app");
const uiRoot = path.join(app, "ui");
const files = fs.readdirSync(uiRoot).filter((file) => /\.(tsx?|css)$/.test(file));
const source = files.filter((file) => !file.endsWith(".css")).map((file) => fs.readFileSync(path.join(uiRoot, file), "utf8")).join("\n");
const canonicalPath = path.join(app, "canonical.css");
const css = fs.existsSync(canonicalPath) ? fs.readFileSync(canonicalPath, "utf8") : "";

const OWNED_GLOBAL_CSS = [
  "app/canonical.css",
  "app/design-system.css",
  "app/design-tokens.css",
  "app/employee-management.css",
  "app/theme-policy.css",
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
const ownedSorted = [...OWNED_GLOBAL_CSS].sort();
const extraCss = cssFiles.filter((file) => !OWNED_GLOBAL_CSS.includes(file));
const missingCss = OWNED_GLOBAL_CSS.filter((file) => !cssFiles.includes(file));
if (JSON.stringify(cssFiles) !== JSON.stringify(ownedSorted)) {
  failures.push("app CSS inventory must match the live owned stylesheet allowlist");
}

const result = {
  files,
  cssBytes: Buffer.byteLength(css),
  importantCount: (css.match(/!important/g) || []).length,
  inlineStyleCount: (source.match(/style=\{\{/g) || []).length,
  migrationCount: migrations.length,
  cssFiles,
  extraCss,
  missingCss,
  status: failures.length ? "FAIL" : "PASS",
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length ? 1 : 0;
