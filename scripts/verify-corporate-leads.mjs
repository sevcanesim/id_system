import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "app/kurumsal/CorporateLeadForm.tsx",
  "app/api/corporate-leads/route.ts",
  "supabase/migrations/20260814193000_corporate_leads.sql",
];
const fail = (message) => { console.error(`Corporate lead contract BAŞARISIZ: ${message}`); process.exit(1); };

for (const file of required) if (!fs.existsSync(path.join(root, file))) fail(`${file} eksik.`);
const page = fs.readFileSync(path.join(root, "app/kurumsal/page.tsx"), "utf8");
const form = fs.readFileSync(path.join(root, "app/kurumsal/CorporateLeadForm.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/corporate-leads/route.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260814193000_corporate_leads.sql"), "utf8");

if (!page.includes('id="teklif"') || !page.includes("CorporateLeadForm")) fail("Teklif formu sayfaya bağlanmamış.");
if (!form.includes('fetch("/api/corporate-leads"') || !form.includes('name="fullName"') || !form.includes('name="email"')) fail("Form alanları veya endpoint eksik.");
if (!route.includes("consumeDistributedRateLimit") || !route.includes("corporate_leads") || !route.includes("z.object")) fail("API validation/rate-limit/persistence kontratı eksik.");
if (!migration.includes("create table if not exists public.corporate_leads") || !migration.includes("enable row level security")) fail("Lead migration/RLS kontratı eksik.");
console.log("Corporate lead contract BAŞARILI.");
