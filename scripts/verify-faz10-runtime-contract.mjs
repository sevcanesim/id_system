import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const staging = fs.readFileSync('.github/workflows/staging-integration.yml', 'utf8');
const production = fs.readFileSync('.github/workflows/production-deploy.yml', 'utf8');
const smoke = fs.readFileSync('scripts/verify-production-smoke.mjs', 'utf8');
const drift = fs.readFileSync('scripts/verify-migration-drift-runtime.mjs', 'utf8');
const refresh = fs.readFileSync('scripts/refresh-faz10-visual-baselines.mjs', 'utf8');

let failed = false;
function check(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else { console.error(`FAIL  ${message}`); failed = true; }
}

check(staging.includes('npm run verify:migration-drift'), 'staging promotion blocks on local/remote migration drift');
check(staging.includes('npm run verify:phase20:staging'), 'staging promotion uses canonical Phase 20 gate');
check(staging.includes('npm run test:quality'), 'staging promotion includes accessibility/responsive quality gate');
check(staging.includes('npm run test:visual'), 'staging promotion includes public + authenticated visual regression');
check(production.includes('needs: staging-gate'), 'production deploy cannot start before reusable staging gate');
check(production.includes('npm run verify:phase20:production'), 'production env/build contract runs before deploy');
check(production.includes('npm run verify:faz10:smoke'), 'production deploy is followed by live smoke verification');
check(smoke.includes("'/urunler/nfc-kart'"), 'production smoke covers primary product route');
check(smoke.includes("'/giris'"), 'production smoke covers authentication entry route');
check(packageJson.scripts['verify:faz10:local']?.includes('verify:faz9:local'), 'FAZ 10 local qualification includes frozen FAZ 9 baseline');
check(packageJson.scripts['verify:faz10:staging']?.includes('verify:migration-drift'), 'FAZ 10 staging command explicitly checks migration drift');
check(packageJson.scripts['verify:faz10:production']?.includes('verify:phase20:production'), 'FAZ 10 production command uses canonical production gate');
check(packageJson.scripts['verify:faz10:visual:refresh']?.includes('refresh-faz10-visual-baselines.mjs'), 'FAZ 10 exposes controlled Darwin baseline refresh');
check(refresh.includes('test:quality') && refresh.includes('--update-snapshots') && refresh.includes('test:visual'), 'visual refresh keeps quality -> update -> verification order');
check(drift.includes('supabase link --project-ref'), 'migration drift diagnostic gives explicit Supabase link recovery');

if (failed) process.exit(1);
console.log('\nFAZ 10 runtime/promotion contract verification passed.');
