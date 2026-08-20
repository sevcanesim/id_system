import fs from "node:fs";
import path from "node:path";
import { renderDemoTestUsersMarkdown } from "../tests/fixtures/demo-user-matrix.mjs";

const target = path.join(process.cwd(), "DEMO_TEST_USERS.md");
fs.writeFileSync(target, renderDemoTestUsersMarkdown());
console.log(`Wrote ${path.relative(process.cwd(), target)}`);
