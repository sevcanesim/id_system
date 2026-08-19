import fs from 'node:fs';

const path = process.env.PHASE0_RUNTIME_EVIDENCE || 'runtime-evidence/phase0-payment-evidence.json';
if (!fs.existsSync(path)) {
  console.error(`FAZ 0 runtime evidence missing: ${path}`);
  console.error('Create the evidence file from staging/sandbox runs before production promotion.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(path,'utf8'));
const failures = [];
const min = { successful_payments:10, failed_payments:5, callback_replays:5, claim_recoveries:5 };
for (const [key,value] of Object.entries(min)) if (Number(data?.counts?.[key]||0) < value) failures.push(`${key} must be >= ${value}`);
for (const key of ['environment','site_url','callback_url','executed_at','supabase_project_ref']) if (!String(data?.[key]||'').trim()) failures.push(`${key} missing`);
if (data.environment !== 'sandbox' && data.environment !== 'staging') failures.push('environment must be sandbox or staging');
if (data.production_keys_used === true) failures.push('production_keys_used must not be true');
if (data.duplicate_order_or_entitlement_detected === true) failures.push('duplicate order/entitlement detected during callback replay');
if (data.failed_payment_created_entitlement === true) failures.push('failed payment created entitlement');
if (data.fresh_db_migration_pass !== true) failures.push('fresh_db_migration_pass must be true');
if (data.callback_publicly_reachable !== true) failures.push('callback_publicly_reachable must be true');
if (failures.length) {
  console.error('FAZ 0 runtime evidence FAILED:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('FAZ 0 runtime evidence PASS. Required sandbox scenario counts and safety assertions are satisfied.');
