import fs from 'node:fs';
const checks = [
 ['migration', 'supabase/migrations/20260813113000_phase17_member_lifecycle_owner_transfer.sql'],
 ['ownership API', 'app/api/organizations/ownership/route.ts'],
 ['doc', 'docs/ORGANIZATION_LIFECYCLE_PHASE17_V25.8.58.md'],
 ['audit', 'audit/PHASE17_ORGANIZATION_LIFECYCLE_AUDIT.json'],
];
let failed=false; for (const [label,file] of checks){if(fs.existsSync(file)) console.log('PASS ',label+': '+file); else {console.error('FAIL ',label+': '+file);failed=true}}
const sql=fs.readFileSync(checks[0][1],'utf8');
for(const [label,s] of [['profile suspension',"card_status='SUSPENDED'"],['physical shutdown',"status='DISABLED'"],['owner transfer','transfer_organization_ownership'],['owner demotion',"role='ADMIN'"],['new owner',"role='OWNER'"]]){if(sql.includes(s)) console.log('PASS ',label); else {console.error('FAIL ',label);failed=true}}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); if(/^25\.8\.(?:5[8-9]|[6-9]\d)$/.test(pkg.version)) console.log('PASS  package version retains Phase 17 lifecycle or later'); else failed=true;
if(failed) process.exit(1); console.log('\nPhase 17 organization lifecycle verification passed.');
