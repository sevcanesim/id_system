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

const overview = read('app/kurumsal/panel/components/OverviewPanel.tsx');
const overviewKpis = overview.split('v26-reference-kpis')[1]?.split('v26-reference-main-row')[0] || '';
const overviewKpiCount = (overviewKpis.match(/<article/g) || []).length;
if (overviewKpiCount === 4) pass('overview KPI strip has four metric cards');
else fail(`overview KPI strip should have 4 cards, found ${overviewKpiCount}`);

if (client.includes('NFC ile paylaşım') || client.includes('Anlık güncelleme') || overview.includes('NFC ile paylaşım')) {
  fail('overview hero must not use passive marketing chips as fake actions');
} else {
  pass('overview hero no longer uses passive marketing chips');
}
if (
  client.includes('<OverviewPanel') &&
  overview.includes('Birincil panel görevleri') &&
  overview.includes('Çalışanları yönet') &&
  overview.includes('openTab(key)')
) {
  pass('overview quick actions navigate to primary panel tasks');
} else {
  fail('overview quick actions are missing primary-task navigation');
}
if (
  !client.includes('v25-dashboard-grid') &&
  !overview.includes('v25-dashboard-grid') &&
  overview.includes('p11-overview-today') &&
  css.includes('.p11-overview-today')
) {
  pass('overview is a single workspace without the legacy duplicate dashboard');
} else {
  fail('overview still stacks a duplicate dashboard or is missing the today queue');
}

const heroPreview = read('app/kurumsal/panel/components/CorporateHeroPreview.tsx');
if (heroPreview.includes('width: 112') && heroPreview.includes('QR bağlantısını kopyala') && heroPreview.includes('Kart erişimi')) {
  pass('hero QR is a compact share action rather than the main canvas');
} else {
  fail('hero QR share accessory contract is missing');
}

const employees = read('app/kurumsal/panel/components/EmployeesPanel.tsx');
if (
  employees.includes('lisans kullanılıyor') &&
  employees.includes('+1 lisans satın almanız gerekiyor') &&
  !employees.includes('Lisans Gerekli') &&
  employees.includes('className="p11-bulk-bar"') &&
  employees.includes('Kartı Yönet') &&
  !employees.includes('Kartım')
) {
  pass('employees license-full, bulk toolbar, and card-action language are aligned');
} else {
  fail('employees license-full / bulk / card-action contract is missing');
}
if (css.includes('.p11-bulk-bar') && css.includes('.p11-capacity-warning')) {
  pass('employee bulk bar and capacity warning have panel styles');
} else {
  fail('employee bulk bar / capacity warning CSS is missing');
}
const drawer = read('app/kurumsal/panel/components/EmployeeDrawer.tsx');
if (drawer.includes('v25-drawer-workspace') && css.includes('.ds-drawer.v25-employee-drawer') && drawer.includes('title="Çalışan Detay"')) {
  pass('employee detail uses overlay workspace with adjacent card preview');
} else {
  fail('employee detail overlay/workspace contract is missing');
}
if (
  drawer.includes('v25-status-summary') &&
  drawer.includes('Durum özeti') &&
  css.includes('.v25-status-summary') &&
  drawer.includes('<dt>Rol</dt>') &&
  drawer.includes('<dt>Erişim</dt>')
) {
  pass('employee status chips are consolidated into a labeled summary');
} else {
  fail('employee status summary contract is missing');
}

const cardsPanel = read('app/kurumsal/panel/components/CardsPanel.tsx');
if (
  client.includes('<EmployeeDrawer') &&
  !client.includes('<EmployeeDrawer>')
) {
  pass('employee drawer JSX is a props element');
} else {
  fail('employee drawer JSX wrapper would fail to parse');
}
if (
  client.includes('<CardsPanel') &&
  cardsPanel.includes('p11-cards') &&
  cardsPanel.includes('Kartı Yönet') &&
  cardsPanel.includes('Henüz fiziksel kart kaydı yok.') &&
  css.includes('.p11-cards') &&
  css.includes('min-height: calc(100svh - 160px)')
) {
  pass('cards tab uses a full-height inventory workspace');
} else {
  fail('cards tab full-height inventory contract is missing');
}
if (
  cardsPanel.includes('p11-card-flow') &&
  cardsPanel.includes('p11-card-flow-copy') &&
  cardsPanel.includes('variant="primary"') &&
  css.includes('.p11-card-hardware-action')
) {
  pass('cards metrics form a relationship chain and activate is a primary action');
} else {
  fail('cards relationship/activate contract is missing');
}

const linksPanel = read('app/kurumsal/panel/components/CorporateLinksPanel.tsx');
if (
  linksPanel.includes('corp-link-status') &&
  linksPanel.includes('<dt>Kayıt</dt>') &&
  linksPanel.includes('<dt>Yayın</dt>') &&
  linksPanel.includes('<dt>Kaynak</dt>') &&
  linksPanel.includes('corp-link-editor') &&
  css.includes('.corp-link-status')
) {
  pass('corporate links show labeled save/publish/source state in a stacked editor');
} else {
  fail('corporate links status/editor contract is missing');
}
if (
  linksPanel.includes('className="corp-file"') &&
  linksPanel.includes('Görüntüle') &&
  linksPanel.includes('Değiştir') &&
  linksPanel.includes('window.confirm') &&
  linksPanel.includes('<strong>Sürüm geçmişi</strong>') &&
  css.includes('.corp-file')
) {
  pass('corporate files are compact and delete/history are explicit');
} else {
  fail('corporate file chip / delete / history contract is missing');
}
const analyticsPanel = read('app/kurumsal/panel/components/AnalyticsPanel.tsx');
if (
  analyticsPanel.includes('Henüz etkileşim verisi oluşmadı') &&
  analyticsPanel.includes('Kartımı Gör') &&
  analyticsPanel.includes('Paylaşım Ayarları') &&
  !client.includes('Bu dönem için görüntülenme verisi yok.')
) {
  pass('analytics empty state explains why data is missing and next actions');
} else {
  fail('analytics empty-state contract is missing');
}
if (
  client.includes('<AnalyticsPanel') &&
  analyticsPanel.includes('Görüntülenme trendi') &&
  analyticsPanel.includes('En çok görüntülenen kart') &&
  analyticsPanel.includes('p11-analytics-compare') &&
  analyticsPanel.includes('v26-chart-canvas')
) {
  pass('analytics tab shows trend, comparison, and top card from real data');
} else {
  fail('analytics workspace contract is missing');
}
if (
  client.includes('seat-pack-badge') &&
  client.includes('/ paket') &&
  client.includes('seat-pack-cta') &&
  client.includes('Paketi Seç') &&
  !client.includes('<em>En çok tercih edilen</em>') &&
  css.includes('.seat-pack-badge') &&
  css.includes('display: block')
) {
  pass('license packs have badge, stacked price, and primary CTA');
} else {
  fail('license pack hierarchy/price/CTA contract is missing');
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));
if (migrations.length === 55) pass('55 database migrations preserved'); else fail(`migration count changed: ${migrations.length}`);
