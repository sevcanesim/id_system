import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const notes = [];
const ok = (cond, msg) => cond ? notes.push(`PASS  ${msg}`) : failures.push(`FAIL  ${msg}`);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    ent.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
ok(pkg.version === lock.version, "package.json and package-lock.json versions match");
ok(lock.packages?.[""]?.version === pkg.version, "lockfile root package version matches");
ok(pkg.engines?.node?.includes(">=20.11.0"), "Node engine baseline is declared");

const requiredScripts = ["typecheck","test:unit","build","test:quality","test:visual","test:cross-browser","verify:secrets"];
for (const s of requiredScripts) ok(Boolean(pkg.scripts?.[s]), `release script exists: ${s}`);

const requiredFiles = [
  "playwright.config.ts","playwright.quality.config.ts","playwright.visual.config.ts","playwright.cross-browser.config.ts",
  "vitest.config.ts","tsconfig.json","next.config.ts","middleware.ts",".env.example"
];
for (const f of requiredFiles) ok(fs.existsSync(path.join(root, f)), `baseline file exists: ${f}`);

const files = walk(root);
const cssFiles = files.filter(f => f.endsWith(".css"));
for (const f of cssFiles) {
  const txt = fs.readFileSync(f, "utf8");
  let n=0, bad=false;
  for (const ch of txt) { if (ch==="{") n++; else if (ch==="}") { n--; if (n<0) bad=true; } }
  ok(!bad && n===0, `CSS brace balance: ${path.relative(root,f)}`);
}

const pageFiles = files.filter(f => /\/app\/.*\/page\.(tsx|ts|jsx|js)$/.test(f.replaceAll("\\","/")) || /\/app\/page\.(tsx|ts|jsx|js)$/.test(f.replaceAll("\\","/")));
ok(pageFiles.length > 0, `route inventory detected (${pageFiles.length} page routes)`);
const migrations = files.filter(f => f.replaceAll("\\","/").includes("/supabase/migrations/") && f.endsWith(".sql"));
ok(migrations.length > 0, `Supabase migrations retained (${migrations.length})`);
const unitTests = files.filter(f => f.replaceAll("\\","/").includes("/tests/unit/") && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f));
ok(unitTests.length > 0, `unit tests retained (${unitTests.length})`);
const e2eTests = files.filter(f => f.replaceAll("\\","/").includes("/tests/e2e/") && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f));
ok(e2eTests.length > 0, `E2E tests retained (${e2eTests.length})`);
const snapshots = files.filter(f => f.includes("snapshots") && /\.(png|jpg|jpeg)$/.test(f));
notes.push(`INFO  visual snapshot files: ${snapshots.length}`);

for (const generated of ["node_modules", ".next", "tsconfig.tsbuildinfo"]) {
  const exists = fs.existsSync(path.join(root, generated));
  notes.push(`INFO  workspace generated artifact ${exists ? "present (normal after install/build)" : "absent"}: ${generated}`);
}

const envFiles = files.filter(f => /^\.env($|\.)/.test(path.basename(f)) && path.basename(f) !== ".env.example");
notes.push(`INFO  workspace runtime env files: ${envFiles.length} (release exclusion is enforced by release packaging / secret verification)`);

console.log(notes.join("\n"));
if (failures.length) {
  console.error("\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nPhase 0 static baseline verification passed.");
