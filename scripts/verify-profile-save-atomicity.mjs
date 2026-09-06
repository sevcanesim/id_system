import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(path.join(root, "app/api/profiles/save/route.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260906235000_atomic_profile_privacy_save.sql"), "utf8");

const assertions = [
  [route.includes('.rpc("save_own_card_profile_with_privacy"'), "profile saves use the atomic privacy RPC"],
  [!route.includes('.from("card_profiles")\n      .update(postSavePatch)'), "profile saves do not apply privacy preferences after the core save"],
  [migration.includes('select public.save_own_card_profile('), "atomic profile save reuses the guarded profile write"],
  [migration.includes('search_indexing_enabled = coalesce'), "atomic profile save persists indexing preference"],
  [migration.includes("then null else slug end"), "atomic profile save can clear a custom slug"],
];

let failed = false;
for (const [passed, message] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"}  ${message}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
