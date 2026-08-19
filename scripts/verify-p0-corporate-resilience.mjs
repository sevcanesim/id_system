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

if (css.includes('.v26-reference-dashboard,.v26-reference-main-row')) {
  fail('overview dashboard must not share a 2-column rule with the chart/activity row');
} else {
  pass('overview dashboard is not coupled to the chart/activity row');
}
if (css.includes('.v26-reference-dashboard { display:grid; grid-template-columns:minmax(0,1fr);')) {
  pass('overview dashboard uses a single shrinking column');
} else {
  fail('overview dashboard is missing minmax(0,1fr) column contract');
}
if (css.includes('repeat(4,minmax(0,1fr))') && css.includes('minmax(0,1.4fr) minmax(0,.6fr)')) {
  pass('overview KPIs and chart/activity use shrinking minmax tracks');
} else {
  fail('overview KPI/chart grid contract is missing minmax(0) tracks');
}
if (/v26-reference-chart[\s\S]{0,120}overflow-wrap:\s*anywhere/.test(css) || /v26-reference-activity[\s\S]{0,120}overflow-wrap:\s*anywhere/.test(css)) {
  fail('overview widgets must not use overflow-wrap:anywhere letter breaking');
} else {
  pass('overview widgets do not force letter-by-letter wrapping');
}

const overviewKpis = client.split('v26-reference-kpis')[1]?.split('v26-reference-main-row')[0] || '';
const overviewKpiCount = (overviewKpis.match(/<article/g) || []).length;
if (overviewKpiCount === 4) pass('overview KPI strip has four metric cards');
else fail(`overview KPI strip should have 4 cards, found ${overviewKpiCount}`);

if (client.includes('NFC ile paylaşım') || client.includes('Anlık güncelleme')) {
  fail('overview hero must not use passive marketing chips as fake actions');
} else {
  pass('overview hero no longer uses passive marketing chips');
}
if (client.includes('Birincil panel görevleri') && client.includes('Çalışanları yönet') && client.includes('openTab(key)')) {
  pass('overview quick actions navigate to primary panel tasks');
} else {
  fail('overview quick actions are missing primary-task navigation');
}

const heroPreview = read('app/kurumsal/panel/components/CorporateHeroPreview.tsx');
if (heroPreview.includes('width: 112') && heroPreview.includes('QR bağlantısını kopyala') && heroPreview.includes('Kart erişimi')) {
  pass('hero QR is a compact share action rather than the main canvas');
} else {
  fail('hero QR share accessory contract is missing');
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 55) pass('55 database migrations preserved'); else fail(`migration count changed: ${migrations.length}`);
