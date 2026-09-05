import fs from 'node:fs';
import path from 'node:path';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
      .map((raw) => raw.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const i = line.indexOf('=');
        let v = line.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        return [line.slice(0, i).trim(), v];
      }),
  );
}

const env = { ...readEnvFile(path.resolve(process.cwd(), '.env.local')), ...process.env };
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PRODUCTION_SUPABASE_PROJECT_REF',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'LEGAL_TRADE_NAME',
  'LEGAL_ENTITY_TYPE',
  'LEGAL_TAX_OFFICE',
  'LEGAL_REGISTERED_ADDRESS',
  'LEGAL_AUTHORIZED_PERSON',
  'LEGAL_PHONE',
  'LEGAL_WEBSITE',
  'LEGAL_CONTACT_EMAIL',
  'LEGAL_KVKK_EMAIL',
  'LEGAL_PAYMENT_PROVIDER',
  'LEGAL_INVOICE_PROVIDER',
  'LEGAL_EFFECTIVE_DATE',
  'LEGAL_CONTENT_APPROVED',
  'LEGAL_CONTENT_APPROVED_AT',
];
const missing = required.filter((key) => !String(env[key] || '').trim());
if (missing.length) {
  console.error(`Production env eksik: ${missing.join(', ')}`);
  process.exit(1);
}

function fail(message) {
  console.error(`Production env kontrolü BAŞARISIZ: ${message}`);
  process.exit(1);
}

const siteUrl = String(env.NEXT_PUBLIC_SITE_URL).replace(/\/$/, '');
const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, '');
const productionRef = String(env.PRODUCTION_SUPABASE_PROJECT_REF).trim();
const redisUrl = String(env.UPSTASH_REDIS_REST_URL).replace(/\/$/, '');
const iyzicoKeys = ['IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL'];
const paytrKeys = ['PAYTR_MERCHANT_ID', 'PAYTR_MERCHANT_KEY', 'PAYTR_MERCHANT_SALT'];
const configured = (keys) => keys.every((key) => String(env[key] || '').trim());
const partiallyConfigured = (keys) => keys.some((key) => String(env[key] || '').trim()) && !configured(keys);
const hasIyzico = configured(iyzicoKeys);
const hasPaytr = configured(paytrKeys);

if (!/^https:\/\//.test(siteUrl) || /localhost|127\.0\.0\.1/i.test(siteUrl)) fail('NEXT_PUBLIC_SITE_URL gerçek HTTPS production domain olmalı.');
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) fail('NEXT_PUBLIC_SUPABASE_URL geçerli Supabase HTTPS URL olmalı.');
if (!/^[a-z0-9]{20}$/i.test(productionRef)) fail('PRODUCTION_SUPABASE_PROJECT_REF 20 karakterli project ref olmalı.');
if (!supabaseUrl.includes(`https://${productionRef}.supabase.co`)) fail('Production Supabase URL ile project ref eşleşmiyor.');
if (!/^https:\/\//.test(redisUrl)) fail('UPSTASH_REDIS_REST_URL HTTPS olmalı.');
if (partiallyConfigured(iyzicoKeys)) fail(`IYZICO sağlayıcı yapılandırması eksik: ${iyzicoKeys.filter((key) => !String(env[key] || '').trim()).join(', ')}`);
if (partiallyConfigured(paytrKeys)) fail(`PayTR sağlayıcı yapılandırması eksik: ${paytrKeys.filter((key) => !String(env[key] || '').trim()).join(', ')}`);
if (!hasIyzico && !hasPaytr) fail('Production için en az bir ödeme sağlayıcısı (PayTR veya iyzico) eksiksiz yapılandırılmalı.');
if (hasIyzico && !hasPaytr && String(env.IYZICO_BASE_URL).replace(/\/$/, '') !== 'https://api.iyzipay.com') fail('Production IYZICO_BASE_URL https://api.iyzipay.com olmalı; sandbox production gate için kabul edilmez.');
if (hasPaytr && String(env.PAYTR_TEST_MODE).toLowerCase() === 'true') fail('Production PAYTR_TEST_MODE=true olamaz.');
if (env.ALLOW_STAGING_MUTATIONS === 'true') fail('Production ortamında ALLOW_STAGING_MUTATIONS=true olamaz.');
if (String(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).trim() === String(env.SUPABASE_SERVICE_ROLE_KEY).trim()) fail('Publishable key ile service-role key aynı olamaz.');
if (String(env.LEGAL_CONTENT_APPROVED).toLowerCase() !== 'true') fail('LEGAL_CONTENT_APPROVED=true olmadan production yayın yapılamaz.');
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(env.LEGAL_EFFECTIVE_DATE))) fail('LEGAL_EFFECTIVE_DATE YYYY-MM-DD formatında olmalı.');
if (!/^\d{4}-\d{2}-\d{2}/.test(String(env.LEGAL_CONTENT_APPROVED_AT))) fail('LEGAL_CONTENT_APPROVED_AT geçerli bir tarih/zaman olmalı.');
const taxNumber = String(env.LEGAL_TAX_NUMBER || '').trim();
const mersisNumber = String(env.LEGAL_MERSIS_NUMBER || '').trim();
const tradeRegistryNumber = String(env.LEGAL_TRADE_REGISTRY_NUMBER || '').trim();
if (taxNumber && !/^\d{10,11}$/.test(taxNumber)) fail('LEGAL_TAX_NUMBER tanımlanmışsa 10 veya 11 haneli olmalı.');
if (mersisNumber && !/^\d{16}$/.test(mersisNumber)) fail('LEGAL_MERSIS_NUMBER tanımlanmışsa 16 haneli olmalı.');
if (tradeRegistryNumber && !/^[a-z0-9 /.-]{3,64}$/i.test(tradeRegistryNumber)) fail('LEGAL_TRADE_REGISTRY_NUMBER tanımlanmışsa geçerli bir formatta olmalı.');
if (!/^\+?[0-9 ()-]{10,24}$/.test(String(env.LEGAL_PHONE))) fail('LEGAL_PHONE geçerli bir telefon formatında olmalı.');
for (const key of ['LEGAL_CONTACT_EMAIL','LEGAL_KVKK_EMAIL']) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(env[key]))) fail(`${key} geçerli bir e-posta adresi olmalı.`);
}
for (const key of ['LEGAL_TRADE_NAME','LEGAL_ENTITY_TYPE','LEGAL_TAX_OFFICE','LEGAL_REGISTERED_ADDRESS','LEGAL_AUTHORIZED_PERSON','LEGAL_PHONE','LEGAL_WEBSITE','LEGAL_PAYMENT_PROVIDER','LEGAL_INVOICE_PROVIDER']) {
  if (/your-|tanımlanır|placeholder|örnek/i.test(String(env[key]))) fail(`${key} gerçek doğrulanmış değer içermeli.`);
}

console.log(`Production kritik env kontrolü BAŞARILI (${productionRef}, ${siteUrl}).`);
