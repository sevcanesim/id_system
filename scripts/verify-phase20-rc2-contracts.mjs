import fs from 'node:fs';
const pass=(m)=>console.log(`PASS  ${m}`); const fail=(m)=>{console.error(`FAIL  ${m}`);process.exitCode=1};
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const unit=fs.readdirSync('tests/unit').filter((n)=>n.endsWith('.test.ts')).map((n)=>read(`tests/unit/${n}`)).join('\n');
const wizard=read('app/olustur/CardWizard.tsx');
const client=read('app/kurumsal/panel/CorporatePanelClient.tsx');
const employees=read('app/kurumsal/panel/components/EmployeesPanel.tsx');
const checks=[
 ['package version is 25.8.61-rc.2',pkg.version==='25.8.61-rc.2'],
 ['unit tests do not inspect corporate page re-export shell',!unit.includes('app/kurumsal/panel/page.tsx')],
 ['unit tests do not require removed storefront.css',!unit.includes('app/storefront.css')],
 ['unit tests do not require removed brand-system.css',!unit.includes('app/brand-system.css')],
 ['corporate analytics implementation remains present',client.includes('loadCardAnalytics')],
 ['corporate seat packs implementation remains present',client.includes('seatPacks.map')],
 ['corporate bulk invite implementation remains present',client.includes('handleBulkInviteFile')&&employees.includes('CSV ile Davet')],
 ['employee editor exposes HR audit helper copy',wizard.includes('Kendi bilgin · değişiklik İK kaydına düşer')],
 ['employee editor exposes rejected title request state',wizard.includes('titleRequest?.status === "REJECTED"')],
];
for(const [m,ok] of checks) ok?pass(m):fail(m);
if(!process.exitCode) console.log('\nPhase 20 RC2 contract reconciliation verification passed.');
