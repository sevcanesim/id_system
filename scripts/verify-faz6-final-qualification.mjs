import fs from 'node:fs';

let failed = false;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed = true; console.log(`FAIL  ${m}`); };

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = [
  'verify:faz0:static', 'verify:faz1:static', 'verify:faz2:static',
  'verify:faz3:static', 'verify:faz4:static', 'verify:faz5:static',
  'verify:faz6:local', 'verify:faz6:staging', 'verify:faz6:production',
  'verify:migration-drift', 'verify:release-artifact',
];
for (const script of requiredScripts) pkg.scripts?.[script] ? pass(`final qualification script registered: ${script}`) : fail(`final qualification script registered: ${script}`);

const requiredFiles = [
  'docs/RC3_RUNTIME_PROMOTION_CHECKLIST.md',
  'docs/PRODUCTION_RELEASE_PHASE20_V25.8.61_RC3.md',
  'docs/FAZ_6_FINAL_RELEASE_QUALIFICATION_V25.8.61_RC3.md',
  '.github/workflows/quality.yml',
  '.github/workflows/staging-integration.yml',
  '.github/workflows/production-deploy.yml',
  'scripts/verify-migration-drift-runtime.mjs',
];
for (const file of requiredFiles) fs.existsSync(file) ? pass(`final qualification artifact exists: ${file}`) : fail(`final qualification artifact exists: ${file}`);

const runtime = fs.readFileSync('docs/RC3_RUNTIME_PROMOTION_CHECKLIST.md', 'utf8');
for (const marker of [
  'verify:phase20:staging', 'test:phase19', 'test:e2e', 'IYZICO_BASE_URL=https://sandbox-api.iyzipay.com',
  'verify:phase20:production', 'RC3 -> Production: APPROVED', 'RC3 -> Production: BLOCKED',
]) runtime.includes(marker) ? pass(`runtime checklist retains: ${marker}`) : fail(`runtime checklist retains: ${marker}`);

const quality = fs.readFileSync('.github/workflows/quality.yml', 'utf8');
quality.includes('npm run verify:p0:static') && quality.includes('npm run verify:release')
  ? pass('quality workflow retains source-quality and release gates')
  : fail('quality workflow retains source-quality and release gates');
!quality.includes('test:visual') && !quality.includes('playwright')
  ? pass('quality workflow keeps legacy visual Playwright gate removed')
  : fail('quality workflow keeps legacy visual Playwright gate removed');

const staging = fs.readFileSync('.github/workflows/staging-integration.yml', 'utf8');
staging.includes('npm run verify:phase20:staging') ? pass('staging workflow retains canonical promotion gate') : fail('staging workflow retains canonical promotion gate');
!staging.includes('test:visual') && !staging.includes('playwright')
  ? pass('staging workflow keeps legacy visual Playwright gate removed')
  : fail('staging workflow keeps legacy visual Playwright gate removed');

const production = fs.readFileSync('.github/workflows/production-deploy.yml', 'utf8');
production.includes('needs: staging-gate') ? pass('production deployment remains blocked by staging') : fail('production deployment remains blocked by staging');
production.includes('npm run verify:phase20:production') ? pass('production workflow retains canonical production gate') : fail('production workflow retains canonical production gate');

if (failed) process.exit(1);
console.log('\nFAZ 6 final release qualification contract passed.');
