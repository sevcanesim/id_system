import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const checks = [];
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  checks.push(ok);
};

const types = read("lib/identity/user-types.ts");
const tests = read("lib/identity/user-types.test.ts");
const accountType = read("lib/auth/account-type.ts");
const migration = read("supabase/migrations/20260819230000_user_identity_types.sql");
const freshDb = read("scripts/verify-fresh-db.mjs");
const pkg = JSON.parse(read("package.json"));

check("identity type module exists", fs.existsSync(path.join(root, "lib/identity/user-types.ts")));
check("identity type tests exist", fs.existsSync(path.join(root, "lib/identity/user-types.test.ts")));
check("three user types are named", types.includes("identity product family") && types.includes("occupancy") && types.includes("package code"));
check("Pet ID is a product family not a login portal", types.includes('"PET_ID"') && accountType.includes('export type AccountType = "TEST" | "INDIVIDUAL" | "CORPORATE"') && !accountType.includes("PET_ID"));
check("Digital ID keeps bireysel and kurumsal occupancies", types.includes("DIGITAL_ID") && types.includes('"INDIVIDUAL"') && types.includes('"CORPORATE"'));
check("coming-soon families are typed", ["BUSINESS_MINI_SITE", "RESTAURANT", "EMERGENCY_ID", "VEHICLE_ID"].every((code) => types.includes(`"${code}"`) && migration.includes(`'${code}'`)));
check("analytics is measurement not a user type", types.includes("IDENTITY_MEASUREMENT_CAPABILITIES") && !types.includes('"ANALYTICS"'));
check("UNASSIGNED package exists until purchase", types.includes("UNASSIGNED_PACKAGE_CODE") && migration.includes("'UNASSIGNED'"));
check("package catalog is persisted", migration.includes("create table if not exists public.identity_package_catalog") && migration.includes("create table if not exists public.user_identity_types"));
check("user_accounts stores family and package", migration.includes("identity_product_family") && migration.includes("package_code") && freshDb.includes("identity_product_family,package_code"));
check("refresh is database-authoritative", migration.includes("refresh_user_identity") && migration.includes("entitlements_refresh_user_identity"));
check("Pet ID catalog row is not live checkout", /code: "PET_ID"[\s\S]*live: false/.test(types) && migration.includes("('PET_ID', 'Pet ID', 'INDIVIDUAL', 'PET_ID', false)"));
check("tests cover package-derived triples", tests.includes("typesFromPackageCode") && tests.includes("typesFromSku") && tests.includes("PET_ID"));
check("verifier is registered", pkg.scripts?.["verify:user-identity-types"] === "node scripts/verify-user-identity-types.mjs");

if (checks.some((ok) => !ok)) {
  console.error("\nUser identity type verification failed.");
  process.exit(1);
}
console.log("\nUser identity type verification passed.");
