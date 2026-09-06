import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkoutRoute = fs.readFileSync(path.join(root, "app/api/commerce/checkout/route.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260906234000_atomic_checkout_order_and_billing_access.sql"), "utf8");

const assertions = [
  [checkoutRoute.includes('.rpc("create_checkout_order"'), "checkout writes its initial order through one RPC"],
  [!checkoutRoute.includes('.from("commerce_orders").insert('), "checkout does not create orders in a separate client call"],
  [migration.includes('create or replace function public.create_checkout_order'), "atomic checkout function exists"],
  [migration.includes('insert into public.commerce_order_items'), "atomic checkout persists items"],
  [migration.includes('insert into public.shipping_addresses'), "atomic checkout persists shipping"],
  [migration.includes('insert into public.commerce_order_billing_profiles'), "atomic checkout persists billing snapshots"],
  [migration.includes('insert into public.commerce_order_consents'), "atomic checkout persists consent evidence"],
  [migration.includes("member.role = 'OWNER'"), "corporate billing snapshots are owner-only under RLS"],
];

let failed = false;
for (const [passed, message] of assertions) {
  console.log(`${passed ? "PASS" : "FAIL"}  ${message}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
