import fs from 'node:fs';
import assert from 'node:assert/strict';

const nav = fs.readFileSync('app/kurumsal/panel/domain/navigation.ts', 'utf8');
const client = fs.readFileSync('app/kurumsal/panel/CorporatePanelClient.tsx', 'utf8');

const tabs = ['overview','employees','cards','templates','content','analytics','licenses','organization','roles','settings'];
for (const tab of tabs) {
  assert.match(nav, new RegExp(`${tab}: \\{[^}]*loadingLabel:`), `Missing loadingLabel for ${tab}`);
}
assert.match(client, /CORPORATE_PANEL_TAB_META\[activeTab\]\.loadingLabel/);
assert.doesNotMatch(client, /const loadingLabel = activeTab ===/);
assert.doesNotMatch(client, /Kurumsal panel yükleniyor/);
console.log('Phase 23 corporate loading labels: PASS');
