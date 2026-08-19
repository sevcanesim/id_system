import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const failures=[]; const notes=[];
const ok=(c,m)=>c?notes.push(`PASS  ${m}`):failures.push(`FAIL  ${m}`);
const required=[
  "audit/PHASE1_PRODUCT_ARCHITECTURE_AUDIT.md",
  "audit/PHASE1_ROUTE_INVENTORY.json",
  "audit/PHASE1_COMPONENT_INVENTORY.json",
  "audit/PHASE1_DESIGN_DEBT_METRICS.json",
  "audit/PHASE1_USER_TYPE_MATRIX.md",
  "audit/PHASE1_CRITICAL_JOURNEYS.md",
];
for(const f of required) ok(fs.existsSync(path.join(root,f)),`audit artifact exists: ${f}`);
const routes=JSON.parse(fs.readFileSync(path.join(root,"audit/PHASE1_ROUTE_INVENTORY.json"),"utf8"));
const actual=[];
function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name==="page.tsx")actual.push(path.relative(root,p).replaceAll("\\","/"));}}
walk(path.join(root,"app"));
ok(routes.length===actual.length,`route audit count matches source (${actual.length})`);
const audited=new Set(routes.map(r=>r.file));
ok(actual.every(f=>audited.has(f)),"every page route is present in route audit");
ok(routes.every(r=>r.domain&&r.purpose&&r.primary_action),"every route has domain, purpose and primary action");
const metrics=JSON.parse(fs.readFileSync(path.join(root,"audit/PHASE1_DESIGN_DEBT_METRICS.json"),"utf8"));
ok(metrics.totals?.lines>0,"design debt metrics populated");
ok(metrics.shared_css_class_count>0,"duplicate CSS ownership metric populated");
console.log(notes.join("\n"));
if(failures.length){console.error("\n"+failures.join("\n"));process.exit(1);}
console.log("\nPhase 1 architecture audit verification passed.");
