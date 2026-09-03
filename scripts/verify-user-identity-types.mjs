import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
let failed = false;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
};

const accountType = read("lib/auth/account-type.ts");
const accountRouter = read("lib/auth/account-router.ts");
const migration = read("supabase/migrations/20260819230000_user_identity_types.sql");
const freshDb = read("scripts/verify-fresh-db.mjs");
const pkg = JSON.parse(read("package.json"));

check("account type module defines the supported login overlays", accountType.includes('"TEST" | "INDIVIDUAL" | "CORPORATE"'));
check("product family and package are database-backed", migration.includes("identity_product_family") && migration.includes("package_code") && migration.includes("identity_package_catalog"));
check("fresh database contract reads identity family and package", freshDb.includes("identity_product_family,package_code"));
check("account routing remains separate from product-family identity", accountRouter.includes('from("user_accounts")') && accountRouter.includes("account_type") && !accountType.includes("PET_ID"));
check("identity migration refreshes entitlement-derived identity", migration.includes("refresh_user_identity") && migration.includes("entitlements_refresh_user_identity"));
check("verifier is registered", pkg.scripts?.["verify:user-identity-types"] === "node scripts/verify-user-identity-types.mjs");

if (failed) process.exit(1);
console.log("\nUser identity type verification passed.");
