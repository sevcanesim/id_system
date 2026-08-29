import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`P0 release gate BAŞARISIZ: ${message}`); process.exit(1); };
const quality = read('.github/workflows/quality.yml');
const staging = read('.github/workflows/staging-integration.yml');
const production = read('.github/workflows/production-deploy.yml');
const scripts = JSON.parse(read('package.json')).scripts || {};
if (!quality.includes('npm run verify:p0:static')) fail('Quality Gate verify:p0:static çalıştırmıyor.');
if (!quality.includes('npm run verify:release')) fail('Quality Gate source/build verification çalıştırmıyor.');
if (!staging.includes('npm run verify:release')) fail('Staging gate source verification çalıştırmıyor.');
if (!production.includes('npm run verify:phase20:production')) fail('Production workflow canonical production verification scriptini çalıştırmıyor.');
for (const key of ['verify:p0:static','verify:ui-system','verify:release-artifact','verify:release','verify:product:qa','verify:faz4:static']) if (!scripts[key]) fail(`package.json script eksik: ${key}`);
if (quality.includes('test:visual') || quality.includes('verify:visual-contract')) fail('Legacy visual-test gate hâlâ Quality workflow içinde.');
if (staging.includes('test:visual') || staging.includes('verify:visual-contract')) fail('Legacy visual-test gate hâlâ staging workflow içinde.');
if (scripts['verify:visual-contract']) fail('Legacy verify:visual-contract scripti hâlâ package.json içinde.');
console.log('P0 release gate contract BAŞARILI: current source/build, UI and product-QA gates are wired; browser regression remains a separate runtime quality layer.');
