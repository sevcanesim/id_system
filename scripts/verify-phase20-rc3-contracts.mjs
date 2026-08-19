import fs from 'node:fs';
const pass=(m)=>console.log(`PASS  ${m}`); const fail=(m)=>{console.error(`FAIL  ${m}`);process.exitCode=1};
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const ui=read('tests/unit/ui-foundation.test.ts');
const business=read('tests/unit/business-login-portal.test.ts');
const brand=read('tests/unit/brand-message.test.ts');
const profile=read('tests/unit/profile-entitlement-gate.test.ts');
const bulk=read('tests/unit/bulk-invite-csv.test.ts');
const employees=read('app/kurumsal/panel/components/EmployeesPanel.tsx');
const css=read('app/employee-management.css');
const checks=[
 ['package version is current package.1 or later',/^25\.8\.(?:6[2-9]|[7-9]\d)(?:-|$)/.test(pkg.version)],
 ['loading-state test follows canonical Skeleton primitive',ui.includes('<Skeleton')&&ui.includes('@keyframes ds-skeleton')],
 ['business portal test follows dynamic portal destination',business.includes('setReturnPath(nextPortal === "business" ? "/kurumsal/panel" : "/kartlarim")')],
 ['support-message test follows shared AppShell mail channel',brand.includes('app/components/ui/AppShell.tsx')&&brand.includes('aria-label=\"Destek ekibine e-posta gönder\"')],
 ['corporate route sync test follows canonical path map',profile.includes('router.push(tabRoutes[tab])')&&profile.includes('/kurumsal/panel/ayarlar')],
 ['bulk invite preview renders a real accessible table',employees.includes('p11-bulk-invite-table')&&employees.includes('aria-label="Toplu davet önizlemesi"')&&employees.includes('bulkInvitePreview.rows.slice(0, 12)')],
 ['bulk invite table has bounded responsive ownership',css.includes('.p11-bulk-invite-table{')&&css.includes('overflow:auto')&&css.includes('min-width:680px')],
 ['bulk invite unit contract follows current table owner',bulk.includes('p11-bulk-invite-table')],
];
for(const [m,ok] of checks) ok?pass(m):fail(m);
if(!process.exitCode) console.log('\nPhase 20 RC3 final unit-contract verification passed.');
