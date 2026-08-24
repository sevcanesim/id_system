import fs from "node:fs";
import { spawnSync } from "node:child_process";

const manifest = "app/styles/canonical-source/manifest.json";
if (!fs.existsSync(manifest)) {
  console.log("INFO — canonical source decomposition is not activated yet");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["scripts/decompose-canonical-css.mjs", "--verify"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
