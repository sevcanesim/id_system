import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pass = (label) => console.log(`PASS  ${label}`);
const fail = (label) => { console.error(`FAIL  ${label}`); process.exitCode = 1; };

const routes = {
  overview: 'app/kurumsal/panel/page.tsx',
  employees: 'app/kurumsal/panel/calisanlar/page.tsx',
  templates: 'app/kurumsal/panel/sablon/page.tsx',
  settings: 'app/kurumsal/panel/ayarlar/page.tsx',
  roles: 'app/kurumsal/panel/roller/page.tsx',
  cards: 'app/kurumsal/panel/kartlar/page.tsx',
  content: 'app/kurumsal/panel/icerik/page.tsx',
  analytics: 'app/kurumsal/panel/istatistikler/page.tsx',
  licenses: 'app/kurumsal/panel/lisans/page.tsx',
  organization: 'app/kurumsal/panel/organizasyon/page.tsx',
};

for (const [key, file] of Object.entries(routes)) {
  const source = read(file);
  if (source.includes(`<CorporatePanelClient key="${key}" />`)) pass(`route ${key} has an explicit remount key`);
  else fail(`route ${key} is missing explicit remount key`);
}

for (const file of ['app/kurumsal/panel/loading.tsx', 'app/kurumsal/panel/error.tsx']) {
  if (fs.existsSync(path.join(root, file))) pass(`corporate ${path.basename(file)} boundary exists`);
  else fail(`corporate ${path.basename(file)} boundary is missing`);
}

const client = read('app/kurumsal/panel/CorporatePanelClient.tsx');
if (client.includes('setLoadingError(detail)') && client.includes('Çalışanlar yüklenemedi.')) pass('employee API failures use the persistent data-error channel');
else fail('employee API failure does not use the persistent data-error channel');
if (client.includes('className="enterprise-data-error"') && client.includes('Yeniden Dene')) pass('corporate data error banner has a retry action');
else fail('corporate data error banner/retry action is missing');
if (client.includes('setLoading(false)') && client.includes('waitForInitialPanelLoads') && client.includes('fetchWithPanelTimeout')) pass('panel loading has bounded request/initial-load timeout logic');
else fail('panel loading timeout contract is missing');

const css = read('app/canonical.css');
if (!css.includes('enterprise-route-loading')) fail('route loading shell CSS is missing'); else pass('route loading shell CSS exists');
if (!css.includes('enterprise-data-error')) fail('data error banner CSS is missing'); else pass('data error banner CSS exists');
if (css.includes('!important')) fail('canonical CSS contains !important'); else pass('canonical CSS remains !important-free');

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 55) pass('55 database migrations preserved'); else fail(`migration count changed: ${migrations.length}`);
