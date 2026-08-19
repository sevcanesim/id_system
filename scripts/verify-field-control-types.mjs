import fs from "node:fs";
import path from "node:path";

const file = path.resolve("app/components/ui/DesignSystem.tsx");
const source = fs.readFileSync(file, "utf8");
const required = [
  "isValidElement<FieldControlProps>(children)",
  "cloneElement(children, {",
];
const forbidden = [
  "children.props as { id?: string }",
  "children.props as { \"aria-describedby\"?: string }",
  "children.props as { \"aria-invalid\"?: boolean }",
];
const missing = required.filter((x) => !source.includes(x));
const presentForbidden = forbidden.filter((x) => source.includes(x));
if (missing.length || presentForbidden.length) {
  console.error("FAIL Field control typing invariant");
  missing.forEach((x) => console.error(`- missing: ${x}`));
  presentForbidden.forEach((x) => console.error(`- forbidden: ${x}`));
  process.exit(1);
}
console.log("PASS Field control typing: cloneElement props are type-safe.");
