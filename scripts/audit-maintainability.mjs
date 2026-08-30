import fs from "node:fs";
import path from "node:path";

const roots = ["app", "lib"];
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(tsx?|css)$/.test(name)) files.push(full);
  }
}
roots.forEach(walk);

const rows = files.map((file) => ({
  file,
  lines: fs.readFileSync(file, "utf8").split(/\r?\n/).length,
})).sort((a, b) => b.lines - a.lines);

const css = rows.filter((r) => r.file.endsWith(".css"));
const tsx = rows.filter((r) => r.file.endsWith(".tsx"));
console.log("\nLargest CSS files");
css.slice(0, 15).forEach((r) => console.log(String(r.lines).padStart(6), r.file));
console.log("\nLargest TSX files");
tsx.slice(0, 15).forEach((r) => console.log(String(r.lines).padStart(6), r.file));
console.log("\nThresholds");
console.log("CSS > 2500 lines:", css.filter((r) => r.lines > 2500).length);
console.log("TSX > 1200 lines:", tsx.filter((r) => r.lines > 1200).length);

const report = {
  generatedAt: new Date().toISOString(),
  largestCss: css.slice(0, 20),
  largestTsx: tsx.slice(0, 20),
  cssOver2500: css.filter((r) => r.lines > 2500),
  tsxOver1200: tsx.filter((r) => r.lines > 1200),
};
fs.mkdirSync("audit", { recursive: true });
fs.writeFileSync("audit/MAINTAINABILITY_CURRENT.json", JSON.stringify(report, null, 2) + "\n");
