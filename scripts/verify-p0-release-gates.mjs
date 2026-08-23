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
if (quality.includes('test:visual') || quality.includes('verify:visual-contract')) fail('Legacy visual-test gate hâlâ Quality workflow içinde.');
if (!staging.includes('npm run verify:release')) fail('Staging gate source verification çalıştırmıyor.');
if (staging.includes('test:visual') || staging.includes('verify:visual-contract')) fail('Legacy visual-test gate hâlâ staging workflow içinde.');
if (staging.includes('npm run verify:phase20:staging') || staging.includes('ALLOW_STAGING_MUTATIONS') || staging.includes('STAGING_SITE_URL')) {
  fail('Pre-deploy workflow production isolation sözleşmesini staging mutation ile karıştırıyor.');
}
for (const contract of ['PRODUCTION_SUPABASE_URL', 'PRODUCTION_SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN', 'npm run verify:migration-drift', 'npm run verify:db', 'npm run verify:catalog']) {
  if (!staging.includes(contract)) fail(`Pre-deploy workflow runtime contract eksik: ${contract}`);
}
if (!production.includes('npm run verify:phase20:production')) fail('Production workflow canonical production verification scriptini çalıştırmıyor.');

for (const key of ['verify:p0:static', 'verify:ui-system', 'verify:release-artifact', 'verify:release']) {
  if (!scripts[key]) fail(`package.json script eksik: ${key}`);
}
if (!String(scripts['verify:release'] || '').includes('verify:critical-journeys')) {
  fail('verify:release must print critical-journey coverage so skeleton E2E cannot look like a pass.');
}
if (scripts['verify:visual-contract']) fail('Legacy verify:visual-contract scripti hâlâ package.json içinde.');

console.log('P0 release gate contract BAŞARILI: source/build gate aktif, legacy visual gate kaldırıldı; browser regression ayrı kalite katmanı olabilir.');
