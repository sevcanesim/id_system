import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
let failed = 0;
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => { failed += 1; console.error(`FAIL  ${message}`); };
const check = (condition, message) => condition ? pass(message) : fail(message);
const pkg = JSON.parse(read("package.json"));

const version = String(pkg.version || "").split(".").map(Number);
const atLeast = (target) => version.length === 3 && version.every((part, index) => part > target[index] || (part === target[index] && version.slice(index + 1).every((n, j) => n >= target[index + 1 + j] ?? true)));
const css = read("app/canonical.css");
const layout = read("app/layout.tsx");

check(atLeast([25, 9, 0]), "current package version is 25.9 or later");
check(exists("app/canonical.css") && !exists("app/ui/styles.css"), "single canonical stylesheet is present");
check(layout.includes('import "./canonical.css";') && !layout.includes("ui/styles.css"), "root layout owns the canonical stylesheet");
check(!/var\(--yi-/.test(css), "legacy yi token family is removed");
check(!/!important\b/.test(css), "canonical CSS contains no !important");
check([".ds-button", ".ds-card", ".ds-page-header", ".ds-page-loading"].every((selector) => css.includes(selector)), "core DS primitives remain canonical");
check([".p8-corporate-editor", ".p8-editor-grid", ".p8-preview-column"].every((selector) => css.includes(selector)), "corporate card editor has a complete responsive layout contract");
check(["PanelSidebar", "AdminPageHeader", "ButtonLink"].every((token) => read("app/components/ui/AppShell.tsx").includes(token)), "individual application shell uses canonical primitives");
const states = read("app/components/ui/States.tsx");
check(states.includes("export function LoadingState") && states.includes("FoundationEmptyState"), "loading and empty states have canonical compatibility paths");
check(exists("supabase/migrations"), "database migrations remain present");

let braceBalance = 0;
for (const char of css) braceBalance += char === "{" ? 1 : char === "}" ? -1 : 0;
check(braceBalance === 0, "canonical CSS braces are balanced");

console.log(`\nCurrent UI refactor gate: ${failed ? "FAIL" : "PASS"}`);
if (failed) process.exit(1);
