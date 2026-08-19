import { createClient } from "@supabase/supabase-js";

function fail(message) {
  console.error(`Production demo-account kontrolü BAŞARISIZ: ${message}`);
  process.exit(1);
}

const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
const expectedRef = String(process.env.PRODUCTION_SUPABASE_PROJECT_REF || "").trim();
if (!url || !key || !expectedRef) fail("production Supabase URL, service role key ve project ref gerekli.");
if (!url.includes(`https://${expectedRef}.supabase.co`)) fail("Supabase URL production project ref ile eşleşmiyor.");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let page = 1;
const forbidden = [];
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) fail(error.message);
  for (const user of data.users) {
    if (user.email?.toLowerCase().endsWith("@yenomi.test")) forbidden.push(user.email);
  }
  if (data.users.length < 200) break;
  page += 1;
  if (page > 50) fail("beklenmeyen kullanıcı sayısı; tarama güvenlik sınırını aştı.");
}
if (forbidden.length) fail(`${forbidden.length} demo/test Auth hesabı production projesinde bulundu: ${forbidden.slice(0, 5).join(", ")}${forbidden.length > 5 ? " …" : ""}`);
console.log("Production demo-account kontrolü BAŞARILI: @yenomi.test hesabı yok.");
