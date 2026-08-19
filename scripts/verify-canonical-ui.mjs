import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const app = path.join(root, "app");
const css = path.join(app, "canonical.css");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const cssFiles = [];
function walkCss(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCss(file);
    else if (/\.(css|scss|sass|less)$/.test(entry.name)) cssFiles.push(path.relative(root, file));
  }
}
walkCss(app);

const canonical = fs.existsSync(css) ? fs.readFileSync(css, "utf8") : "";
const layout = fs.existsSync(path.join(app, "layout.tsx")) ? read("app/layout.tsx") : "";
const routeCssImports = [];
function walkSource(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSource(file);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const source = fs.readFileSync(file, "utf8");
      if (path.relative(root, file) !== "app/layout.tsx" && /import\s+[^;\n]+\.css/.test(source)) routeCssImports.push(path.relative(root, file));
    }
  }
}
walkSource(app);

let braceBalance = 0;
for (const char of canonical) braceBalance += char === "{" ? 1 : char === "}" ? -1 : 0;

const checks = {
  canonicalStylesheet: fs.existsSync(css),
  singleStylesheet: cssFiles.length === 1 && cssFiles[0] === "app/canonical.css",
  rootOwnsCanonicalStylesheet: layout.includes('import "./canonical.css";'),
  noSecondaryStylesheetImport: !layout.includes("ui/styles.css"),
  balancedBraces: braceBalance === 0,
  noImportant: !/!important\b/.test(canonical),
  noLegacyYiTokens: !/var\(--yi-/.test(canonical),
  noRouteCssImports: routeCssImports.length === 0,
  p8CorporateEditorContract: [".p8-corporate-editor", ".p8-editor-grid", ".p8-preview-column"].every((selector) => canonical.includes(selector)),
};

console.log(JSON.stringify({ ...checks, cssFiles, routeCssImports }, null, 2));
if (!Object.values(checks).every(Boolean)) process.exit(1);
