import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const drawer = fs.readFileSync(`${root}app/kurumsal/panel/components/EmployeeDrawer.tsx`, 'utf8');
const client = fs.readFileSync(`${root}app/kurumsal/panel/CorporatePanelClient.tsx`, 'utf8');
const checks = [
  ['loading heading', drawer.includes('viewLoading === drawerMember.id') && drawer.includes('"Kart yükleniyor"')],
  ['ready heading requires loaded profile', drawer.includes('viewedProfile?.memberId === drawerMember.id && viewedProfile.profiles.length > 0') && drawer.includes('"Kart hazır"')],
  ['stale profile cleared before fetch', client.includes('setViewedProfile(null);')],
  ['generic contradiction removed', !drawer.includes('{cardState?.hasDigitalCard\n                                        ? "Kart hazır"')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
process.exitCode = failed ? 1 : 0;
