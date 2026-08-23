import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[line.slice(0, i).trim()] = value;
  }
  return out;
}

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'lib/config/commercial.ts'), 'utf8');
const expected = new Map();
for (const match of source.matchAll(/sku:\s*"([A-Z0-9-]+)",\s*priceKurus:\s*([\d_]+)/g)) expected.set(match[1], Number(match[2].replaceAll('_', '')));
const packages = fs.readFileSync(path.join(root, 'lib/commerce/packages.ts'), 'utf8');
for (const match of packages.matchAll(/code:\s*"(CORP-\d+)",\s*name:\s*"[^"]+",\s*seats:\s*\d+,\s*priceKurus:\s*([\d_]+)/g)) {
  expected.set(`YENOMI-${match[1]}`, Number(match[2].replaceAll('_', '')));
}
for (const match of packages.matchAll(/sku:\s*"(YENOMI-BUSINESS-SEATS-\d+)",\s*seats:\s*\d+,\s*priceKurus:\s*([\d_]+)/g)) {
  expected.set(match[1], Number(match[2].replaceAll('_', '')));
}

const env = { ...readEnvFile(path.join(root, '.env.local')), ...process.env };
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('verify:catalog için NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(1);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const skus = [...expected.keys()];
const { data, error } = await supabase.from('product_variants').select('sku,price_kurus,billing_period,metadata,is_active').in('sku', skus);
if (error) throw error;
const rows = new Map((data || []).map((row) => [row.sku, row]));
let failed = false;
for (const sku of skus) {
  const row = rows.get(sku);
  if (!row) { console.error(`✗ ${sku}: DB varyantı yok`); failed = true; continue; }
  if (!row.is_active) { console.error(`✗ ${sku}: DB varyantı pasif`); failed = true; continue; }
  if (Number(row.price_kurus) !== expected.get(sku)) { console.error(`✗ ${sku}: kod=${expected.get(sku)} DB=${row.price_kurus}`); failed = true; continue; }
  const metadata = row.metadata || {};
  if (sku === 'YENOMI-NFC-CARD-ANNUAL' && row.billing_period !== 'YEARLY') { console.error(`✗ ${sku}: yıllık dönem eksik`); failed = true; continue; }
  if (sku === 'YENOMI-NFC-EXTRA' && (row.billing_period !== 'ONE_TIME' || metadata.requires_active_entitlement !== true)) { console.error(`✗ ${sku}: tek seferlik/aktif hak kuralı eksik`); failed = true; continue; }
  if (sku === 'YENOMI-DIGITAL-RENEWAL-ANNUAL' && (metadata.fulfillment_kind !== 'DIGITAL_RENEWAL' || Number(metadata.physical_card_count) !== 0)) { console.error(`✗ ${sku}: dijital yenileme kapsamı hatalı`); failed = true; continue; }
  if (sku === 'YENOMI-NFC-PREMIUM-ANNUAL' && (metadata.fulfillment_kind !== 'INITIAL_BUNDLE' || Number(metadata.network_mail_credits) !== 100)) { console.error(`✗ ${sku}: Premium Network Mail hakkı hatalı`); failed = true; continue; }
  if (sku === 'YENOMI-PREMIUM-RENEWAL-ANNUAL' && (metadata.fulfillment_kind !== 'DIGITAL_RENEWAL' || Number(metadata.physical_card_count) !== 0 || Number(metadata.network_mail_credits) !== 100)) { console.error(`✗ ${sku}: Premium yenileme kapsamı hatalı`); failed = true; continue; }
  if (sku === 'YENOMI-PREMIUM-UPGRADE' && (metadata.fulfillment_kind !== 'PREMIUM_UPGRADE' || Number(metadata.physical_card_count) !== 0 || Number(metadata.network_mail_credits) !== 100)) { console.error(`✗ ${sku}: Premium yükseltme kapsamı hatalı`); failed = true; continue; }
  if (sku === 'YENOMI-NFC-REPLACEMENT' && metadata.fulfillment_kind !== 'REPLACEMENT_CARD') { console.error(`✗ ${sku}: replacement kapsamı hatalı`); failed = true; continue; }
  if (sku.startsWith('YENOMI-CORP-') && (metadata.fulfillment_kind !== 'CORPORATE_PACKAGE' || Number(metadata.physical_card_count) <= 0 || metadata.shipping_included !== true)) { console.error(`✗ ${sku}: kurumsal paket kapsamı hatalı`); failed = true; continue; }
  console.log(`✓ ${sku}: ${row.price_kurus} kuruş`);
}
if (failed) process.exit(1);
console.log('Katalog / DB fiyat senkronu BAŞARILI.');
