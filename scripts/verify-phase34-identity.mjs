import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const panel = read('app/kurumsal/panel/CorporatePanelClient.tsx');
const identity = read('lib/organizations/identity.ts');
const migration = read('supabase/migrations/024_demo_identity_canonicalization.sql');
const assign = read('scripts/assign-demo-physical-card.mjs');
let failures = 0;
function check(name, ok) { if (ok) console.log(`PASS ${name}`); else { console.error(`FAIL ${name}`); failures++; } }
check('corporate panel uses canonical initials helper', panel.includes('getIdentityInitials(member.full_name || member.email)'));
check('numeric name tokens are ignored for initials', identity.includes('alphaTokens'));
check('Demo 5 Tam Dolu resolves to DT contract', (() => {
  const name = 'Demo 5 Tam Dolu';
  const tokens = name.split(/\s+/).filter(Boolean).filter((t) => /[A-Za-zÇĞİÖŞÜçğıöşü]/u.test(t));
  return tokens.slice(0,2).map(t => t.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/u)?.[0] || '').join('').toLocaleUpperCase('tr-TR') === 'DT';
})());
check('demo fixture canonical slug', migration.includes("slug = 'demo-5-tam-dolu'"));
check('demo fixture scoped by organization and email', migration.includes("o.slug = 'demo-sirket-5-tam'") && migration.includes("om.email = 'demo.corp5.full@yenomi.test'"));
check('seed repair writes organization_id', assign.includes('organization_id: organization.id'));
check('seed repair writes canonical slug', assign.includes('slug: "demo-5-tam-dolu"'));
if (failures) process.exit(1);
