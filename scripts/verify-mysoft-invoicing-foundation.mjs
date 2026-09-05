import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260903213000_commerce_invoice_jobs.sql", "utf8");
const config = fs.readFileSync("lib/invoicing/mysoft-config.ts", "utf8");
const runbook = fs.readFileSync("docs/commerce/MYSOFT_INVOICE_INTEGRATION.md", "utf8");

for (const marker of [
  "create table if not exists public.commerce_invoice_jobs",
  "order_id uuid not null unique",
  "idempotency_key text not null unique",
  "invoice_snapshot jsonb not null",
  "trg_queue_paid_commerce_invoice_job",
  "after insert or update of status on public.commerce_orders",
  "if new.status <> 'PAID' then",
  "on conflict (order_id) do nothing",
  "KREDIKARTI/BANKAKARTI",
]) {
  if (!migration.includes(marker)) throw new Error(`Mysoft invoice safety marker missing: ${marker}`);
}

for (const marker of ["MYSOFT_INVOICING_ENABLED", "MYSOFT_API_BEARER_TOKEN", "MYSOFT_TENANT_IDENTIFIER_NUMBER"]) {
  if (!config.includes(marker)) throw new Error(`Mysoft configuration marker missing: ${marker}`);
}

for (const marker of ["separate Yenomi issuer", "EARSIV", "PayTR", "NEEDS_RECONCILIATION"]) {
  if (!runbook.includes(marker)) throw new Error(`Mysoft runbook marker missing: ${marker}`);
}

console.log("Mysoft invoicing foundation contract PASS.");
