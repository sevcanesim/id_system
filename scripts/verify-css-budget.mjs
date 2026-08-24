import { execFileSync } from "node:child_process";
import fs from "node:fs";

const CANONICAL = "app/canonical.css";
const MODULE_PREFIX = "app/styles/canonical-";
const MAX_MODULE_LINES = 1500;
const MAX_MODULE_BYTES = 100 * 1024;
const base = process.env.DESIGN_SYSTEM_BASE || "HEAD^";

function metrics(content) {
  return {
    lines: content.length === 0 ? 0 : content.split("\n").length,
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

function readGitFile(ref, file) {
  try {
    return execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

const failures = [];
const currentCanonical = fs.readFileSync(CANONICAL, "utf8");
const current = metrics(currentCanonical);
const baseCanonical = readGitFile(base, CANONICAL);

if (baseCanonical !== null) {
  const previous = metrics(baseCanonical);
  if (current.lines > previous.lines) {
    failures.push(`${CANONICAL} must not grow (${previous.lines} -> ${current.lines} lines)`);
  }
  if (current.bytes > previous.bytes) {
    failures.push(`${CANONICAL} must not grow (${previous.bytes} -> ${current.bytes} bytes)`);
  }
}

if (fs.existsSync("app/styles")) {
  for (const entry of fs.readdirSync("app/styles", { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith("canonical-") || !entry.name.endsWith(".css")) continue;
    const file = `app/styles/${entry.name}`;
    if (!file.startsWith(MODULE_PREFIX)) continue;
    const value = metrics(fs.readFileSync(file, "utf8"));
    if (value.lines > MAX_MODULE_LINES) failures.push(`${file} exceeds ${MAX_MODULE_LINES} lines (${value.lines})`);
    if (value.bytes > MAX_MODULE_BYTES) failures.push(`${file} exceeds ${MAX_MODULE_BYTES} bytes (${value.bytes})`);
  }
}

if (failures.length) {
  console.error("CSS architecture budget violations:\n");
  for (const failure of failures) console.error(`FAIL — ${failure}`);
  process.exit(1);
}

console.log(`PASS — ${CANONICAL} did not grow from ${base}`);
console.log(`PASS — canonical modules stay within ${MAX_MODULE_LINES} lines / ${MAX_MODULE_BYTES} bytes`);
