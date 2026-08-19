import fs from "node:fs";
import path from "node:path";
const root=process.cwd();let failed=0;
const check=(c,m)=>c?console.log(`PASS  ${m}`):(failed++,console.error(`FAIL  ${m}`));
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

for(const f of [
  "docs/LEGACY_REMOVAL_PHASE14_V25.8.55.md",
  "audit/PHASE14_LEGACY_REMOVAL_AUDIT.json",
  "app/canonical.css"
]) check(fs.existsSync(path.join(root,f)),`phase14 canonical artifact exists: ${f}`);

for(const f of ["app/panel-system.css","app/profile-editor.css","app/corporate-platform.css","app/dashboard-flow.css","app/public-card.css","app/design-tokens.css","app/design-system.css"])
  check(!fs.existsSync(path.join(root,f)),`${f} remains retired`);

const layout=read("app/layout.tsx"), tokens=read("app/canonical.css"),
  kart=read("app/kartim/page.tsx"), wizard=read("app/olustur/CardWizard.tsx"),
  pub=read("app/components/security/PublicProfileProtection.tsx");

check(!layout.includes("panel-system.css"),"root layout no longer imports panel-system.css");
check(!layout.includes("profile-editor.css"),"root layout no longer imports profile-editor.css");
check(!/--yp-/.test(tokens),"obsolete yp token aliases removed from canonical CSS");
check(!/\byp-/.test(kart),"Kartım no longer uses yp classes");
check(!/dashboard-(?:shell|main|status|preview|link|copy|action|grid|panel|message)/.test(kart),"Kartım migrated off legacy dashboard selectors");
check(!wizard.includes("HESAP KONTROLÜ"),"visible account-check loading surface removed");
check(!/individual-(?:nav|sidebar-spacer)/.test(wizard),"corporate editor no longer depends on individual nav selectors");
check(wizard.includes("PageLoadingView"),"profile editor uses canonical view loading state");
check(pub.includes("p12-profile-watermark"),"public watermark ownership moved to public card surface");

for(const f of ["app/p/[publicId]/page.tsx","app/c/[cardCode]/page.tsx","app/[slug]/page.tsx"])
  check(!read(f).includes("qr.css"),`public route no longer imports qr.css: ${f}`);

const tsx=[];
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,e.name);
  if(e.isDirectory())walk(p); else if(e.name.endsWith(".tsx"))tsx.push(fs.readFileSync(p,"utf8"));
}};
walk(path.join(root,"app"));
const source=tsx.join("\n");
check(!/\bindividual-[A-Za-z0-9_-]+/.test(source),"no individual-* legacy classes remain in TSX");
check(!/var\(--(?:yp)-/.test(source),"no yp legacy token references remain in TSX");

const pkg=JSON.parse(read("package.json"));
const vm=String(pkg.version||"").match(/^(\d+)\.(\d+)\.(\d+)/);
const baseline=[25,8,55];
const current=vm?vm.slice(1).map(Number):null;
const versionAtLeastBaseline=Boolean(current)&&(current[0]>baseline[0]||(current[0]===baseline[0]&&(current[1]>baseline[1]||(current[1]===baseline[1]&&current[2]>=baseline[2]))));
check(versionAtLeastBaseline,"package version retains Phase 14 legacy removal or later");
check(pkg.scripts?.["verify:phase14:legacy"]==="node scripts/verify-phase14-legacy-removal.mjs","phase14 verifier registered");

if(failed){console.error(`\nPhase 14 legacy removal verification failed (${failed}).`);process.exit(1)}
console.log("\nPhase 14 legacy removal verification passed.");
