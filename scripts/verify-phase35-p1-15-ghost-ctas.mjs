import fs from 'node:fs';

const css = fs.readFileSync('app/globals.css','utf8');
const how = fs.readFileSync('app/nasil-calisir/page.tsx','utf8');
const support = fs.readFileSync('app/destek/page.tsx','utf8');
const checks = [
  ['reference CTA contract', css.includes('.public-reference-page .reference-actions .corporate-secondary-cta')],
  ['explicit visible opacity', css.includes('opacity: 1;')],
  ['secondary CTA visible color', css.includes('color: #f0edf5;')],
  ['how-it-works login CTA', how.includes('href="/giris">Giriş Yap</Link>')],
  ['support account CTA', support.includes('href="/giris">Hesabıma Git</Link>')],
  ['no break-all in contract', !css.includes('.public-reference-page .reference-actions') || !css.match(/\.public-reference-page\.reference-actions[\s\S]{0,1600}break-all/)],
];
for (const [name, ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
if (checks.some(([,ok])=>!ok)) process.exit(1);
