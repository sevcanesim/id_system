import { existsSync, readFileSync } from 'node:fs';

let failed = false;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed = true; console.error(`FAIL  ${m}`); };
const check = (condition, m) => condition ? pass(m) : fail(m);
const files = [
  'app/kartlarim/page.tsx',
  'app/olustur/CardWizard.tsx',
  'app/checkout/page.tsx',
  'app/odeme/basarili/ActivationAction.tsx',
  'app/urunler/page.tsx',
  'app/urunler/nfc-kart/page.tsx',
  'lib/errors.ts',
  'lib/email/resend.ts',
];
for (const file of files) check(existsSync(file), `cleanup source exists: ${file}`);
const sources = files.map((file) => readFileSync(file, 'utf8')).join('\n');
check(!sources.toLocaleLowerCase('tr').includes('kullanım hakk'), 'technical entitlement wording removed from customer-facing product UI');
const dashboard = readFileSync('app/kartlarim/page.tsx', 'utf8');
check(!dashboard.includes('Kullanılabilir hak'), 'dashboard no longer exposes available-entitlement metric');
check(dashboard.includes('spareEntitlementCount'), 'entitlement capability gate retained internally');
const wizard = readFileSync('app/olustur/CardWizard.tsx', 'utf8');
check(wizard.includes('/api/commerce/entitlements'), 'profile creation authorization check retained');
check(wizard.includes('PageLoadingView') && !wizard.includes('HESAP KONTROLÜ'), 'profile builder uses canonical view loading state');
const legal = readFileSync('app/iade-iptal/page.tsx', 'utf8');
check(legal.includes('kullanım hakkı'), 'legal service-right wording retained in legal disclosure');
const pkg = JSON.parse(readFileSync('package.json','utf8'));
check(pkg.version.startsWith('25.8.') && Number(pkg.version.split('.').at(-1)) >= 49, 'package version retains Phase 8.1 cleanup or later');
check(Boolean(pkg.scripts?.['verify:phase8:ui-cleanup']), 'cleanup verifier script registered');
if (failed) process.exit(1);
console.log('\nPhase 8.1 entitlement UI cleanup verification passed.');
