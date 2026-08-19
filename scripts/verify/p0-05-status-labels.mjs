import fs from 'node:fs';
const lifecycle = fs.readFileSync('lib/organizations/lifecycle.ts','utf8');
const panel = fs.readFileSync('app/kurumsal/panel/CorporatePanelClient.tsx','utf8');
const drawer = fs.readFileSync('app/kurumsal/panel/components/EmployeeDrawer.tsx','utf8');
const employees = fs.readFileSync('app/kurumsal/panel/components/EmployeesPanel.tsx','utf8');
const checks = [
  ['central physical label exists', lifecycle.includes('export function physicalCardLabel')],
  ['disabled physical state maps to Devre dışı', /DISABLED:\s*"Devre dışı"/.test(lifecycle)],
  ['cards page uses physicalCardLabel', /data-status=\{card\.status\}>\{physicalCardLabel\(card\.status\)\}/.test(panel)],
  ['employees page uses memberStatusLabel', employees.includes('{memberStatusLabel(member.status)}')],
  ['drawer physical card uses canonical label', drawer.includes('physicalCardLabel')],
  ['no card status Pasif literal', !/card\.status[^\n]*\? "Pasif"/.test(panel)],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (checks.some(([,ok]) => !ok)) process.exit(1);
