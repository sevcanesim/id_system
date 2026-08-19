import fs from 'node:fs';
const css=fs.readFileSync('app/dashboard-flow.css','utf8');
const tsx=fs.readFileSync('app/kurumsal/panel/components/EmployeesPanel.tsx','utf8');
const checks=[
 ['filter controls class',tsx.includes('p11-filter-control')],
 ['department filter class',tsx.includes('className="p11-filter-control"')],
 ['status filter class',tsx.includes('aria-label="Durum filtresi" className="p11-filter-control"')],
 ['sort filter class',tsx.includes('aria-label="Sıralama" className="p11-filter-control"')],
 ['explicit filter background',css.includes('.p11-filter-control{')],
 ['focus-visible',css.includes('.p11-filter-control:focus-visible')],
 ['hover',css.includes('.p11-filter-control:hover')],
 ['disabled',css.includes('.p11-filter-control:disabled')],
 ['no break all',!css.includes('.p11-filter-control{word-break:break-all')]
];
let failed=0; for(const [n,v] of checks){console.log(`${v?'PASS':'FAIL'} ${n}`); if(!v) failed++;}
process.exitCode=failed?1:0;
