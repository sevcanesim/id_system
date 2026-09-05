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

const requiredScripts = ["typecheck", "test", "build", "verify:secrets"];
for (const s of requiredScripts) ok(Boolean(pkg.scripts?.[s]), `release script exists: ${s}`);

const requiredFiles = [
  "tsconfig.json", "next.config.ts", "proxy.ts", ".env.example", "tests/README.md",
];
for (const f of requiredFiles) ok(fs.existsSync(path.join(root, f)), `baseline file exists: ${f}`);

for (const retired of [
  "playwright.config.ts",
  "playwright.quality.config.ts",
  "playwright.visual.config.ts",
  "playwright.cross-browser.config.ts",
]) {
  ok(!fs.existsSync(path.join(root, retired)), `retired Playwright config stays deleted: ${retired}`);
}

const files = walk(root);
const cssFiles = files.filter((f) => f.endsWith(".css") && !f.includes("/node_modules/") && !f.includes("/.next/"));
for (const f of cssFiles) {
  const txt = fs.readFileSync(f, "utf8");
  let n = 0;
  let bad = false;
  for (const ch of txt) {
    if (ch === "{") n++;
    else if (ch === "}") {
      n--;
      if (n < 0) bad = true;
    }
  }
  ok(!bad && n === 0, `CSS brace balance: ${path.relative(root, f)}`);
}

const pageFiles = files.filter((f) => {
  const rel = f.replaceAll("\\", "/");
  return /\/app\/.*\/page\.(tsx|ts|jsx|js)$/.test(rel) || /\/app\/page\.(tsx|ts|jsx|js)$/.test(rel);
});
ok(pageFiles.length > 0, `route inventory detected (${pageFiles.length} page routes)`);
const migrations = files.filter((f) => f.replaceAll("\\", "/").includes("/supabase/migrations/") && f.endsWith(".sql"));
ok(migrations.length > 0, `Supabase migrations retained (${migrations.length})`);

const unitTests = files.filter((f) => {
  const rel = f.replaceAll("\\", "/");
  return /\.(test|spec)\.(ts|tsx)$/.test(rel) && (rel.includes("/lib/") || rel.includes("/app/"));
});
ok(unitTests.length > 0, `colocated unit tests retained (${unitTests.length})`);

const testsReadme = fs.readFileSync(path.join(root, "tests/README.md"), "utf8");
const e2eTests = files.filter((f) => f.replaceAll("\\", "/").includes("/tests/e2e/") && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f));
if (e2eTests.length > 0) {
  ok(true, `E2E tests retained (${e2eTests.length})`);
} else {
  notes.push("INFO  Playwright e2e specs are absent (tests/README reset). Not counted as PASS.");
  ok(testsReadme.includes("intentionally removed"), "test suite reset is documented");
}

const snapshots = files.filter((f) => f.includes("snapshots") && /\.(png|jpg|jpeg)$/.test(f));
notes.push(`INFO  visual snapshot files: ${snapshots.length}`);

for (const generated of ["node_modules", ".next", "tsconfig.tsbuildinfo"]) {
  const exists = fs.existsSync(path.join(root, generated));
  notes.push(`INFO  workspace generated artifact ${exists ? "present (normal after install/build)" : "absent"}: ${generated}`);
}

const envFiles = files.filter((f) => /^\.env($|\.)/.test(path.basename(f)) && path.basename(f) !== ".env.example");
notes.push(`INFO  workspace runtime env files: ${envFiles.length} (release exclusion is enforced by release packaging / secret verification)`);

console.log(notes.join("\n"));
if (failures.length) {
  console.error("\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nPhase 0 static baseline verification passed.");
