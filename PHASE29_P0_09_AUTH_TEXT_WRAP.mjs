import fs from 'node:fs';
const page=fs.readFileSync('app/giris/page.tsx','utf8');
const css=fs.readFileSync('app/canonical.css','utf8');
const checks=[
  ['business note is a dedicated container', page.includes('className="p6-auth-business-note" role="note"')],
  ['business note text is wrapped', page.includes('<span>Kurumsal hesaplar davet')],
  ['business note uses grid', css.includes('.p6-auth-business-note {') && css.includes('grid-template-columns:18px minmax(0,1fr);')],
  ['business note link can wrap', css.includes('.p6-auth-business-note a {') && css.includes('white-space:normal;')],
  ['no break-all in auth note', !css.includes('.p6-auth-business-note') || !css.match(/\.p6-auth-business-note[^}]*break-all/)],
];
let ok=true; for (const [name,pass] of checks) { console.log(`${pass?'PASS':'FAIL'} ${name}`); ok&&=pass; }
process.exit(ok?0:1);
