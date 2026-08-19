import fs from 'node:fs';
import path from 'node:path';

let failed = false;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed = true; console.log(`FAIL  ${m}`); };
const required = [
  'docs/PRODUCTION_RELEASE_PHASE20_V25.8.61_RC3.md',
  'audit/PHASE20_RELEASE_CANDIDATE_AUDIT.json',
  'scripts/verify-production-env.mjs',
  'scripts/verify-iyzico-sandbox-env.mjs',
  'scripts/create-release-package.mjs',
  'tests/e2e/phase19-critical-regression.spec.ts',
  'supabase/migrations/20260815100000_phase19_corporate_profile_isolation.sql',
];
for (const file of required) fs.existsSync(file) ? pass(`phase20 artifact exists: ${file}`) : fail(`phase20 artifact exists: ${file}`);

const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json','utf8'));
pkg.version === '25.8.61-rc.3' ? pass('package version is 25.8.61-rc.3') : fail('package version is 25.8.61-rc.3');
lock.version === pkg.version && lock.packages?.['']?.version === pkg.version ? pass('lockfile version matches RC') : fail('lockfile version matches RC');

for (const script of ['verify:phase20:rc','verify:phase20:runtime','verify:phase20:staging','verify:phase20:production','verify:phase20:sandbox','release:rc']) {
  pkg.scripts?.[script] ? pass(`release script registered: ${script}`) : fail(`release script registered: ${script}`);
}

const envExample = fs.readFileSync('.env.example','utf8');
for (const key of ['PRODUCTION_SUPABASE_PROJECT_REF','STAGING_SUPABASE_PROJECT_REF','PRODUCTION_SUPABASE_URL','IYZICO_BASE_URL','UPSTASH_REDIS_REST_URL']) {
  envExample.includes(`${key}=`) ? pass(`env contract documented: ${key}`) : fail(`env contract documented: ${key}`);
}

const releaseScript = fs.readFileSync('scripts/create-release-package.mjs','utf8');
for (const forbidden of ['node_modules', '.next', '.env.local', 'test-results', 'playwright-report']) {
  releaseScript.includes(forbidden) ? pass(`release excludes local/generated artifact: ${forbidden}`) : fail(`release excludes local/generated artifact: ${forbidden}`);
}

const migrations = fs.readdirSync('supabase/migrations').filter((f)=>f.endsWith('.sql')).length;
migrations >= 49 ? pass(`migration baseline retained (${migrations})`) : fail(`migration baseline retained (${migrations})`);
const unitTests = fs.readdirSync('tests/unit').filter((f)=>/\.(test|spec)\.(ts|tsx)$/.test(f)).length;
unitTests >= 76 ? pass(`unit regression baseline retained (${unitTests})`) : fail(`unit regression baseline retained (${unitTests})`);


const stagingWorkflow = fs.readFileSync('.github/workflows/staging-integration.yml','utf8');
stagingWorkflow.includes('npm run verify:phase20:staging') ? pass('staging workflow runs canonical Phase 20 staging gate') : fail('staging workflow runs canonical Phase 20 staging gate');
for (const key of ['STAGING_SITE_URL','STAGING_IYZICO_API_KEY','STAGING_IYZICO_SECRET_KEY','PRODUCTION_SUPABASE_URL']) {
  stagingWorkflow.includes(key) ? pass(`staging runtime contract wired: ${key}`) : fail(`staging runtime contract wired: ${key}`);
}

for (const artifact of ['node_modules','.next','tsconfig.tsbuildinfo']) {
  fs.existsSync(artifact) ? console.log(`INFO  workspace artifact present (excluded from release): ${artifact}`) : pass(`workspace artifact absent: ${artifact}`);
}

if (failed) process.exit(1);
console.log('\nPhase 20 release candidate static qualification passed.');
