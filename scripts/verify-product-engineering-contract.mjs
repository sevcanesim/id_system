import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "AGENTS.md",
  "docs/product-engineering/README.md",
  "docs/product-engineering/00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md",
  "docs/product-engineering/01_CURRENT_ARCHITECTURE_BASELINE.md",
  "docs/product-engineering/16_AGENT_WORKING_CONTRACT.md",
  "PROJECT_DECISIONS.md",
  "tests/README.md",
  "tests/fixtures/demo-user-matrix.ts",
  "DEMO_TEST_USERS.md",
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("Product engineering contract verification failed:");
  for (const file of missing) console.error(`- missing: ${file}`);
  process.exit(1);
}

const master = fs.readFileSync(path.join(root, "docs/product-engineering/00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md"), "utf8");
const agent = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");

for (const token of ["inspect", "!important", "Design System", "server-side", "regression", "fake"]) {
  if (!master.toLowerCase().includes(token.toLowerCase())) {
    console.error(`Master contract missing required rule: ${token}`);
    process.exit(1);
  }
}

for (const token of ["00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md", "01_CURRENT_ARCHITECTURE_BASELINE.md", "16_AGENT_WORKING_CONTRACT.md"]) {
  if (!agent.includes(token)) {
    console.error(`AGENTS.md missing required contract reference: ${token}`);
    process.exit(1);
  }
}

const working = fs.readFileSync(path.join(root, "docs/product-engineering/16_AGENT_WORKING_CONTRACT.md"), "utf8");
for (const token of ["theme-policy.css", "Selin Kaya", "align-items: stretch", "#F9F8F6", "word-spacing"]) {
  if (!working.includes(token)) {
    console.error(`Agent working contract missing UI guardrail: ${token}`);
    process.exit(1);
  }
}

if (!agent.includes("CSS/SVG") || !agent.includes("#F9F8F6")) {
  console.error("AGENTS.md missing UI guardrail pointers");
  process.exit(1);
}

console.log("Product engineering contract: PASS");
