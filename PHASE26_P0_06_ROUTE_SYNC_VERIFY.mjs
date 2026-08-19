import fs from 'node:fs';
const file = fs.readFileSync('app/kurumsal/panel/CorporatePanelClient.tsx', 'utf8');
const checks = [
  ['search params supported', 'useSearchParams'],
  ['bulk invite URL state', 'bulkInvite=1'],
  ['bulk invite opens employees route', 'tabRoutes.employees}?bulkInvite=1'],
  ['bulk invite closes with route replace', 'router.replace(tabRoutes.employees)'],
  ['EmployeesPanel uses route-aware handler', 'onToggleBulkInvite={openBulkInvite}'],
];
for (const [name, needle] of checks) {
  if (!file.includes(needle)) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
