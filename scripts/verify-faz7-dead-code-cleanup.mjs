import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const notes = [];
const ok = (condition, message) => condition ? notes.push(`PASS  ${message}`) : failures.push(`FAIL  ${message}`);

const staleRootPatterns = [
  /^PHASE_.*_SHA256\.txt$/,
  /^PHASE_.*HOTFIX_SHA256\.txt$/,
  /^SHA256SUMS\.txt$/,
  /^PHASE_0_BASELINE_MANIFEST\.json$/,
  /^PHASE_(?:0|1|2|4|5|6|7|8|9|10|11|12|13|14|15|18|19)_.*V25.*\.md$/,
  /^PHASE_19_BROWSER_HOTFIX\.md$/,
];
const rootFiles = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
const staleRootFiles = rootFiles.filter((name) => staleRootPatterns.some((pattern) => pattern.test(name)));
ok(staleRootFiles.length === 0, `stale root verification/build artifacts removed${staleRootFiles.length ? `: ${staleRootFiles.join(", ")}` : ""}`);

const gitignore = fs.existsSync(path.join(root, ".gitignore")) ? fs.readFileSync(path.join(root, ".gitignore"), "utf8") : "";
const releaseScriptPath = path.join(root, "scripts", "create-release-package.mjs");
const releaseScript = fs.existsSync(releaseScriptPath) ? fs.readFileSync(releaseScriptPath, "utf8") : "";
ok(/(?:^|\n)\*\.tsbuildinfo(?:\n|$)/.test(gitignore), "TypeScript build-info cache is ignored by git");
ok(releaseScript.includes('"tsconfig.tsbuildinfo"'), "TypeScript build-info cache is excluded from release package");

const removedSymbols = [
  "isValidTrPhone",
  "setCardStatus",
  "CommercialSku",
  "OrganizationMemberStatus",
  "DIGITAL_ID_PRODUCT",
  "getProductBySku",
  "RENEWAL_PRICE_KURUS",
  "SERVICE_GRACE_DAYS",
  "ACTIVATION_LINK_DAYS",
  "ACTIVATION_RESEND_LINK_HOURS",
  "ACTIVATION_MAX_DELAY_DAYS",
  "DOMESTIC_SHIPPING_ONLY",
];
const codeRoots = ["app", "lib", "types"];
function walk(directory, out = []) {
  if (!fs.existsSync(directory)) return out;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, out);
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) out.push(absolute);
  }
  return out;
}
const productionFiles = codeRoots
  .flatMap((dir) => walk(path.join(root, dir)))
  .filter((file) => !/\.(?:test|spec)\.(?:ts|tsx)$/.test(file));
const testFiles = codeRoots
  .flatMap((dir) => walk(path.join(root, dir)))
  .filter((file) => /\.(?:test|spec)\.(?:ts|tsx)$/.test(file));
const productionText = productionFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const symbol of removedSymbols) {
  ok(!new RegExp(`\\b${symbol}\\b`).test(productionText), `unused symbol removed: ${symbol}`);
}

// Production-file reachability guard. Next metadata routes and middleware are explicit entry points.
const fileByAbsolute = new Map(productionFiles.map((file) => [path.resolve(file), file]));
const importPattern = /(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]|import\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
function resolveRelative(sourceFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = path.extname(base)
    ? [base]
    : [".ts", ".tsx", ".js", ".jsx"].flatMap((ext) => [`${base}${ext}`, path.join(base, `index${ext}`)]);
  return candidates.find((candidate) => fileByAbsolute.has(path.resolve(candidate))) ?? null;
}
const graph = new Map();
for (const file of productionFiles) {
  const deps = [];
  const text = fs.readFileSync(file, "utf8");
  importPattern.lastIndex = 0;
  for (let match; (match = importPattern.exec(text));) {
    const resolved = resolveRelative(file, match[1] ?? match[2]);
    if (resolved) deps.push(path.resolve(resolved));
  }
  graph.set(path.resolve(file), deps);
}
const appEntries = productionFiles.filter((file) => {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const base = path.basename(file);
  return relative === "app/robots.ts" || relative === "app/sitemap.ts" ||
    ["page.ts", "page.tsx", "layout.ts", "layout.tsx", "route.ts", "route.tsx", "loading.tsx", "error.tsx", "not-found.tsx", "template.tsx", "default.tsx"].includes(base);
}).map((file) => path.resolve(file));
for (const relative of [
  "app/LandingClient.tsx",
  "app/components/ui/atoms.ts",
]) {
  const absolute = path.join(root, relative);
  if (fs.existsSync(absolute)) appEntries.push(path.resolve(absolute));
}
const middleware = path.join(root, "middleware.ts");
if (fs.existsSync(middleware)) {
  const text = fs.readFileSync(middleware, "utf8");
  importPattern.lastIndex = 0;
  for (let match; (match = importPattern.exec(text));) {
    const resolved = resolveRelative(middleware, match[1] ?? match[2]);
    if (resolved) appEntries.push(path.resolve(resolved));
  }
}
for (const testFile of testFiles) {
  const text = fs.readFileSync(testFile, "utf8");
  importPattern.lastIndex = 0;
  for (let match; (match = importPattern.exec(text));) {
    const resolved = resolveRelative(testFile, match[1] ?? match[2]);
    if (resolved) appEntries.push(path.resolve(resolved));
  }
}
const reachable = new Set(appEntries);
const queue = [...appEntries];
while (queue.length) {
  const current = queue.shift();
  for (const dep of graph.get(current) ?? []) {
    if (!reachable.has(dep)) {
      reachable.add(dep);
      queue.push(dep);
    }
  }
}
const orphanProductionFiles = productionFiles
  .map((file) => path.resolve(file))
  .filter((file) => !reachable.has(file))
  .map((file) => path.relative(root, file).replaceAll("\\", "/"))
  // Declaration files are compiler inputs, not runtime import-graph nodes.
  .filter((file) => !file.endsWith(".d.ts"));
ok(orphanProductionFiles.length === 0, `no orphan production source files${orphanProductionFiles.length ? `: ${orphanProductionFiles.join(", ")}` : ""}`);

ok(fs.existsSync(path.join(root, "docs")), "canonical docs directory retained");
ok(fs.existsSync(path.join(root, "audit")), "canonical audit evidence retained");
ok(fs.existsSync(path.join(root, "NEXT_TASKS.md")), "active project task document retained");

console.log(notes.join("\n"));
if (failures.length) {
  console.error("\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nFAZ 7 dead-code/file cleanup verification passed.");
