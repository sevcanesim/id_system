import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
function check(label, ok, detail=''){ console.log(`${ok?'PASS':'FAIL'}  ${label}${detail?` — ${detail}`:''}`); checks.push(ok); }

const corporate=read('app/kurumsal/panel/CorporatePanelClient.tsx');
const header=read('app/components/AppHeader.tsx');
const shell=read('app/components/ui/AppShell.tsx');
const cards=read('app/kartlarim/page.tsx');
const card=read('app/kartim/page.tsx');
const states=read('app/components/ui/States.tsx');
const ds=read('app/components/ui/DesignSystem.tsx');
const hero=read('app/kurumsal/panel/components/CorporateHeroPreview.tsx');

const lines=corporate.split(/\r?\n/).length;
const useStates=(corporate.match(/useState/g)||[]).length;
const fetches=(corporate.match(/fetch\(/g)||[]).length;
console.log(`INFO  CorporatePanelClient metrics — ${lines} LOC, ${useStates} useState, ${fetches} fetch calls`);
check('corporate domain types extracted', corporate.includes('from "./domain/types"') && fs.existsSync('app/kurumsal/panel/domain/types.ts'));
check('template field normalization extracted', corporate.includes('from "./domain/template-fields"') && fs.existsSync('app/kurumsal/panel/domain/template-fields.ts'));
check('corporate hero preview is explicit imported component', corporate.includes('import CorporateHeroPreview from "./components/CorporateHeroPreview"') && corporate.includes('<CorporateHeroPreview'));
check('corporate hero preview renders real QR from slug', hero.includes('QRCode.toDataURL') && hero.includes('`${origin}/${slug}`'));
check('corporate panel has no duplicate global AppHeader', !corporate.includes('<AppHeader'));
check('corporate panel remains pathname-aware', corporate.includes('usePathname') && corporate.includes('tabRoutes'));
check('/kartlarim remains dashboard/list intent', cards.includes('activeKey="home"') && cards.includes('Profilinizi, dijital kartınızı ve kişisel marka bilgilerinizi tek bir kimlik stüdyosundan yönetin.'));
check('/kartim remains card-detail intent', card.includes('activeKey="card"') || card.includes('title="Kartım"'));
check('individual and corporate panels share canonical sidebar', shell.includes('<PanelSidebar') && corporate.includes('<PanelSidebar') && !header.includes('PanelSidebar'));
check('States EmptyState remains compatibility adapter', states.includes('DesignSystem') || states.includes('./DesignSystem'));
check('canonical DesignSystem still exports EmptyState', /export function EmptyState|export const EmptyState/.test(ds));
check('header account context still resolves membership once per identity sync', (header.match(/organization_members/g)||[]).length === 1);

if (checks.some(v=>!v)) process.exit(1);
console.log('\nFAZ 1 architecture verification passed.');
