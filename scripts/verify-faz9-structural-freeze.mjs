import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "architecture/STRUCTURAL_FREEZE_V25.8.61_RC3.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let failed = false;
const pass = (m) => console.log(`PASS  ${m}`);
const info = (m) => console.log(`INFO  ${m}`);
const fail = (m) => { failed = true; console.error(`FAIL  ${m}`); };

function walk(dir, targetName, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs, targetName, out);
    else if (ent.name === targetName) out.push(path.relative(root, abs).replaceAll("\\", "/"));
  }
  return out;
}
function sameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}
function loc(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8").split(/\r?\n/).length;
}

const pages = walk(path.join(root, "app"), "page.tsx").sort();
const apis = walk(path.join(root, "app", "api"), "route.ts").sort();
const rootCss = fs.readdirSync(path.join(root, "app")).filter((x) => x.endsWith(".css")).sort();
const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
const cssImports = [...layout.matchAll(/import\s+["']\.\/([^"']+\.css)["'];/g)].map((m) => m[1]);

sameArray(pages, manifest.inventory.pageFiles) ? pass(`page-route inventory frozen (${pages.length})`) : fail("page-route inventory changed; update freeze manifest intentionally");
sameArray(apis, manifest.inventory.apiRouteFiles) ? pass(`API-route inventory frozen (${apis.length})`) : fail("API-route inventory changed; update freeze manifest intentionally");
sameArray(rootCss, manifest.inventory.rootCssFiles) ? pass(`root CSS layer inventory frozen (${rootCss.length})`) : fail("root CSS layer inventory changed; update freeze manifest intentionally");
sameArray(cssImports, manifest.inventory.layoutCssImportOrder) ? pass("layout CSS cascade order frozen") : fail("layout CSS import order changed; review cascade and update freeze manifest intentionally");

for (const retired of manifest.inventory.retiredCssFiles || []) {
  fs.existsSync(path.join(root, retired)) ? fail(`retired stylesheet returned: ${retired}`) : pass(`retired stylesheet stays deleted: ${path.basename(retired)}`);
}

for (const [domain, files] of Object.entries(manifest.ownership)) {
  const missing = files.filter((rel) => !fs.existsSync(path.join(root, rel)));
  missing.length ? fail(`${domain} ownership missing: ${missing.join(", ")}`) : pass(`${domain} ownership anchors present`);
}

function collectTs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) collectTs(abs, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(abs);
  }
  return out;
}
const explicitClients = [...collectTs(path.join(root, "app")), ...collectTs(path.join(root, "lib"))]
  .filter((abs) => {
    const text = fs.readFileSync(abs, "utf8").trimStart();
    return text.startsWith('"use client"') || text.startsWith("'use client'");
  });
explicitClients.length <= manifest.budgets.explicitClientBoundaryMax
  ? pass(`client boundaries did not grow (${explicitClients.length}/${manifest.budgets.explicitClientBoundaryMax})`)
  : fail(`explicit client boundary count grew to ${explicitClients.length}`);

for (const [rel, max] of Object.entries(manifest.budgets.criticalSurfaceMaxLoc)) {
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`critical surface missing: ${rel}`);
    continue;
  }
  const lines = loc(rel);
  lines <= max ? pass(`${rel} LOC budget ${lines}/${max}`) : fail(`${rel} grew to ${lines} LOC (budget ${max})`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const requiredScripts = ["verify:faz9:freeze", "verify:faz9:static", "verify:faz9:local"];
for (const s of requiredScripts) packageJson.scripts?.[s] ? pass(`script registered: ${s}`) : fail(`missing package script: ${s}`);

const forbiddenRoot = ["tsconfig.tsbuildinfo", "playwright-report", "test-results"];
for (const rel of forbiddenRoot) {
  fs.existsSync(path.join(root, rel)) ? info(`generated local artifact present but excluded from release: ${rel}`) : pass(`generated local artifact absent: ${rel}`);
}

if (failed) process.exit(1);
console.log("\nFAZ 9 structural freeze verification passed.");
