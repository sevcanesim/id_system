import fs from "node:fs";
import path from "node:path";

const requestedRoot = process.argv.find((argument) => argument.startsWith("--root="));
const root = requestedRoot ? path.resolve(requestedRoot.slice("--root=".length)) : process.cwd();
const allowLocalEnv = process.argv.includes("--allow-local-env");
const excludedDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "playwright-report",
  "release",
  "test-results",
]);
const excludedFiles = new Set([".env.example", "package-lock.json"]);
const textExtensions = new Set([
  ".css", ".env", ".html", ".js", ".json", ".jsx", ".md", ".mjs",
  ".sql", ".ts", ".tsx", ".txt", ".yaml", ".yml",
]);

const secretPatterns = [
  { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g },
  { label: "JWT token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g },
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: "GitHub token", pattern: /\bgh[oprsu]_[A-Za-z0-9]{20,}\b/g },
];

const forbiddenNames = [/^\.env$/, /^\.env\.local$/, /^\.env\..+\.local$/];
const findings = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;

    if (!allowLocalEnv && forbiddenNames.some((pattern) => pattern.test(entry.name))) {
      findings.push(`${relativePath}: forbidden environment file`);
      continue;
    }
    if (allowLocalEnv && forbiddenNames.some((pattern) => pattern.test(entry.name))) continue;
    if (excludedFiles.has(entry.name) || !textExtensions.has(path.extname(entry.name))) continue;

    const content = fs.readFileSync(fullPath, "utf8");
    for (const { label, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) findings.push(`${relativePath}: ${label}`);
    }
  }
}

walk(root);

if (findings.length > 0) {
  console.error("Secret/source hygiene check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Secret/source hygiene check passed.");
