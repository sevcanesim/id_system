import fs from "node:fs";
import path from "node:path";

const root = path.resolve("app");
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(full);
  }
}
walk(root);
const failures = [];
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const usesLink = /<Link\b|\bLink\s*\(/.test(source);
  if (!usesLink) continue;
  const hasImport = /import\s+Link\s+from\s+["']next\/link["']/.test(source);
  if (!hasImport) failures.push(path.relative(process.cwd(), file));
}
if (failures.length) {
  console.error("FAIL TSX Link imports:");
  for (const file of failures) console.error(`- ${file}`);
  process.exit(1);
}
console.log(`PASS TSX Link imports: ${files.length} files scanned.`);
