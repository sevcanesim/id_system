import fs from "node:fs";
import path from "node:path";

const root = path.resolve("app");
const runtimeNames = new Set(["useId", "useState", "useEffect", "useMemo", "useCallback", "useRef", "useReducer", "useContext", "createContext", "cloneElement", "isValidElement", "forwardRef", "memo", "createElement"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(tsx|ts)$/.test(entry.name) ? [full] : [];
  });
}

const offenders = [];
for (const file of walk(root)) {
  const source = fs.readFileSync(file, "utf8");
  const typeImport = source.match(/import\s+type\s*\{([\s\S]*?)\}\s+from\s+["']react["']/);
  if (!typeImport) continue;
  for (const name of typeImport[1].split(",").map((x) => x.trim()).filter(Boolean)) {
    if (runtimeNames.has(name)) offenders.push(`${file}: ${name}`);
  }
}

if (offenders.length) {
  console.error("FAIL React runtime values imported with import type:");
  offenders.forEach((x) => console.error(`- ${x}`));
  process.exit(1);
}

console.log("PASS React runtime imports: no known runtime React values are imported with import type.");
