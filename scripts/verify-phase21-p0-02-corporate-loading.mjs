import fs from 'node:fs';

const file = 'app/kurumsal/panel/CorporatePanelClient.tsx';
const runtime = 'app/kurumsal/panel/domain/runtime.ts';
const source = fs.readFileSync(file, 'utf8');
const runtimeSource = fs.readFileSync(runtime, 'utf8');

const requiredLabels = [
  'Çalışanlar yükleniyor',
  'Kurumsal şablonlar yükleniyor',
  'Roller ve yetkiler yükleniyor',
  'Şirket ayarları yükleniyor',
  'İstatistikler yükleniyor',
  'Kartlar yükleniyor',
  'Genel Bakış yükleniyor',
];

for (const label of requiredLabels) {
  if (!source.includes(label)) throw new Error(`Missing view loading label: ${label}`);
}
if (source.includes('Kurumsal panel yükleniyor')) throw new Error('Legacy generic corporate loading label remains');
if (!source.includes('fetchWithPanelTimeout')) throw new Error('Corporate panel requests are not timeout-protected');
if (!runtimeSource.includes('controller.abort()')) throw new Error('Panel request timeout does not abort stalled requests');
if (!runtimeSource.includes('INITIAL_PANEL_LOAD_TIMEOUT_MS = 12_000')) throw new Error('Initial panel timeout contract changed unexpectedly');
if (!source.includes('result.timedOut')) throw new Error('Initial load timeout is not surfaced');
if (!source.includes('onClick={() => void reloadPanelData()}')) throw new Error('Retry does not use the controlled panel reload');
if (source.includes('onClick={() => window.location.reload()}')) throw new Error('Retry still hard-reloads the browser');

const requestFunctions = ['loadMembers', 'loadTemplates', 'loadPhysicalCards', 'loadMemberCardStatuses', 'loadCardAnalytics'];
for (const fn of requestFunctions) {
  const start = source.indexOf(`async function ${fn}`);
  if (start < 0) throw new Error(`Missing ${fn}`);
  const end = source.indexOf('\n  async function ', start + 1);
  const chunk = source.slice(start, end < 0 ? start + 2500 : end);
  if (!chunk.includes('fetchWithPanelTimeout(')) throw new Error(`${fn} does not use fetchWithPanelTimeout`);
}

console.log('PASS phase21 P0-02 corporate loading resilience contract');
