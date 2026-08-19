const env = process.env;

function fail(message) {
  console.error(`Staging izolasyon kontrolü BAŞARISIZ: ${message}`);
  process.exit(1);
}

const stagingUrl = String(env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const expectedRef = String(env.STAGING_SUPABASE_PROJECT_REF || "").trim();
const productionUrl = String(env.PRODUCTION_SUPABASE_URL || "").trim();
const productionRef = String(env.PRODUCTION_SUPABASE_PROJECT_REF || "").trim();

if (env.ALLOW_STAGING_MUTATIONS !== "true") fail("ALLOW_STAGING_MUTATIONS=true açıkça tanımlanmalı.");
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(stagingUrl)) fail("geçerli bir staging Supabase URL'si gerekli.");
if (!/^[a-z0-9]{20}$/i.test(expectedRef)) fail("STAGING_SUPABASE_PROJECT_REF 20 karakterli project ref olmalı.");
if (!stagingUrl.includes(`https://${expectedRef}.supabase.co`)) fail("staging URL ile beklenen project ref eşleşmiyor.");
if (productionUrl && stagingUrl.replace(/\/$/, "") === productionUrl.replace(/\/$/, "")) fail("staging ve production URL aynı olamaz.");
if (productionRef && expectedRef === productionRef) fail("staging ve production project ref aynı olamaz.");
if (!String(env.SUPABASE_SERVICE_ROLE_KEY || "").trim()) fail("staging service-role anahtarı eksik.");
if (!String(env.DEMO_SEED_PASSWORD || "").trim()) fail("izole demo seed parolası eksik.");

console.log(`Staging izolasyon kontrolü BAŞARILI (${expectedRef}).`);
