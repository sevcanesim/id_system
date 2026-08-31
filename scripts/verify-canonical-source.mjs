import fs from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";

const manifest = "app/styles/canonical-source/manifest.json";
if (!fs.existsSync(manifest)) {
  console.log("INFO — canonical source decomposition is not activated yet");
  process.exit(0);
}

/* The decomposition manifest is generated debt and may drift on main while
 * canonical ownership is being migrated. Unrelated product/UI PRs must not be
 * blocked by pre-existing drift. When a CI base is supplied, verify the
 * decomposition only if this PR changes canonical source, its parts, or the
 * decomposition engine itself. */
const base = process.env.DESIGN_SYSTEM_BASE;
if (base) {
  try {
    const changed = execFileSync(
      "git",
      [
        "diff",
        "--name-only",
        base,
        "HEAD",
        "--",
        "app/canonical.css",
        "app/styles/canonical-source",
        "scripts/decompose-canonical-css.mjs",
      ],
      { encoding: "utf8" },
    ).trim();

    if (!changed) {
      console.log("PASS — canonical decomposition sources are unchanged from CI base");
      process.exit(0);
    }
  } catch (error) {
    console.error("FAIL — canonical source diff could not be evaluated");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const result = spawnSync(process.execPath, ["scripts/decompose-canonical-css.mjs", "--verify"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
