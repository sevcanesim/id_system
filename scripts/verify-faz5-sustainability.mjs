import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let failed = 0;
const pass = (m) => console.log(`PASS  ${m}`);
const warn = (m) => console.log(`WARN  ${m}`);
const check = (c,m) => c ? pass(m) : (failed++, console.error(`FAIL  ${m}`));
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');

const shell = read('app/components/UserPanelShell.tsx');
const notice = read('app/odeme/basarili/FulfillmentReviewNotice.tsx');
check(!/^['\"]use client['\"];/.test(shell), 'UserPanelShell no longer creates a redundant client boundary');
check(/useSearchParams/.test(notice) && /^['\"]use client['\"];/.test(notice), 'FulfillmentReviewNotice retains its required client boundary');

const migrationDir = path.join(root,'supabase/migrations');
const migrations = fs.readdirSync(migrationDir).filter((n)=>n.endsWith('.sql')).sort();
const valid = migrations.every((n)=>/^\d{3,4}_[a-z0-9_]+\.sql$/.test(n) || /^\d{14}_[a-z0-9_]+\.sql$/.test(n));
check(valid, 'all migrations match an accepted legacy or timestamp naming convention');
const prefixes = migrations.map((n)=>n.match(/^(\d{14}|\d{3,4})_/)?.[1]).filter(Boolean);
check(new Set(prefixes).size === prefixes.length, 'migration prefixes are unique');
const timestampMigrations = migrations.filter((n)=>/^\d{14}_/.test(n));
check(timestampMigrations.join('\n') === [...timestampMigrations].sort().join('\n'), 'timestamp migrations are lexically chronological');
const nowStamp = new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
const future = timestampMigrations.filter((n)=>n.slice(0,14)>nowStamp);
if (future.length) warn(`${future.length} pre-stamped timestamp migration(s) are later than current UTC; do not rename already-applied migrations: ${future.join(', ')}`);

const sourceFiles=[];
function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p);
    else if(/\.(ts|tsx)$/.test(e.name)) sourceFiles.push(p);
  }
}
for(const d of ['app','lib']) if(fs.existsSync(path.join(root,d))) walk(path.join(root,d));
const metrics=sourceFiles.map((p)=>({file:path.relative(root,p),loc:fs.readFileSync(p,'utf8').split(/\r?\n/).length})).sort((a,b)=>b.loc-a.loc);
console.log('\nINFO  Largest TypeScript surfaces (signal only; not a hard failure):');
for(const row of metrics.slice(0,8)) console.log(`INFO  ${String(row.loc).padStart(4)} LOC  ${row.file}`);
if(metrics[0]?.loc>800) warn('large-component signals remain; refactor only with characterization/regression coverage');

const clientFiles = sourceFiles.filter((p)=>/^['\"]use client['\"];/.test(fs.readFileSync(p,'utf8')));
console.log(`INFO  explicit client boundaries: ${clientFiles.length}`);
const LIVE_CLIENT_BOUNDARY_MAX = 54;
check(clientFiles.length <= LIVE_CLIENT_BOUNDARY_MAX, `explicit client-boundary count remains within the live reviewed baseline (${LIVE_CLIENT_BOUNDARY_MAX})`);

if(failed){ console.error(`\nFAZ 5 sustainability verification failed (${failed}).`); process.exit(1); }
console.log('\nFAZ 5 sustainability verification passed.');
