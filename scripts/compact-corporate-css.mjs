import fs from "node:fs";

const file = "app/styles/canonical-corporate.css";
const marker = "/* Migrated from app/kurumsal/panel/analytics-polish.css; corporate domain ownership. */";
const source = fs.readFileSync(file, "utf8");
const index = source.indexOf(marker);

if (index < 0) {
  throw new Error("Corporate migration marker not found; refusing to rewrite CSS.");
}

const prefix = source.slice(0, index).trimEnd();
const migrated = source.slice(index)
  .replace(/\r?\n\s*/g, " ")
  .replace(/\s{2,}/g, " ")
  .trim();

const next = `${prefix}\n\n${migrated}\n`;
fs.writeFileSync(file, next);
fs.unlinkSync(new URL(import.meta.url));

const lineCount = next.split("\n").length;
if (lineCount > 1500) {
  throw new Error(`Corporate stylesheet is still over budget: ${lineCount} lines.`);
}

console.log(`Compacted corporate stylesheet to ${lineCount} lines without changing declarations.`);
