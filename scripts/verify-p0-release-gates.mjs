import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message) { console.error(`P0 release gate BAŞARISIZ: ${message}`); process.exit(1); }

const quality = read('.github/workflows/quality.yml');
const staging = read('.github/workflows/staging-integration.yml');
const production = read('.github/workflows/production-deploy.yml');
const packageJson = JSON.parse(read('package.json'));
const scripts = packageJson.scripts || {};

if (!quality.includes('npm run verify:p0:static')) fail('Quality Gate verify:p0:static çalıştırmıyor.');
if (!quality.includes('npm run verify:release')) fail('Quality Gate source/build verification çalıştırmıyor.');
if (quality.includes('test:visual') || quality.includes('playwright')) fail('Legacy visual-test gate hâlâ Quality workflow içinde.');
if (!staging.includes('npm run verify:release')) fail('Staging gate source verification çalıştırmıyor.');
if (staging.includes('test:visual') || staging.includes('playwright')) fail('Legacy visual-test gate hâlâ staging workflow içinde.');
if (!staging.includes('npm run verify:phase20:staging')) fail('Staging workflow canonical RC3 staging promotion contractını çalıştırmıyor.');
for (const contract of ['STAGING_SITE_URL', 'STAGING_IYZICO_API_KEY', 'STAGING_IYZICO_SECRET_KEY', 'PRODUCTION_SUPABASE_URL']) {
  if (!staging.includes(contract)) fail(`Staging workflow runtime secret/env contract eksik: ${contract}`);
}
if (!production.includes('npm run verify:phase20:production')) fail('Production workflow canonical production verification scriptini çalıştırmıyor.');

for (const key of ['verify:p0:static', 'verify:ui-system', 'verify:release-artifact', 'verify:release']) {
  if (!scripts[key]) fail(`package.json script eksik: ${key}`);
}
if (scripts['verify:visual-contract']) fail('Legacy verify:visual-contract scripti hâlâ package.json içinde.');

console.log('P0 release gate contract BAŞARILI: source/build gate aktif, legacy test gate kaldırıldı.');
