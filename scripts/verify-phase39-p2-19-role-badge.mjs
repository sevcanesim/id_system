import fs from 'node:fs';

const card = fs.readFileSync('app/CardTemplate.tsx', 'utf8');
const drawer = fs.readFileSync('app/kurumsal/panel/components/EmployeeDrawer.tsx', 'utf8');

const checks = [
  ['CardTemplate accepts corporateRole', /corporateRole\?: OrganizationRole \| null/.test(card)],
  ['Owner badge is explicit', /corporateRole === "OWNER"[\s\S]*?"Şirket Sahibi"/.test(card)],
  ['Non-owner badge uses company employee label', /`\$\{companyName\} çalışanı`/.test(card)],
  ['Unknown role does not assert employee status', /: null;/.test(card)],
  ['EmployeeDrawer passes organization role', /corporateRole=\{drawerMember\.role\}/.test(drawer)],
  ['Legacy unconditional employee badge removed', !card.includes('<span className="corp-employee-badge"><Icon name="shield" /> {companyName} çalışanı</span>')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
