import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const required = ['verify:faz0:static','verify:faz0:local','verify:faz0:runtime'];
for (const key of required) {
  if (!pkg.scripts?.[key]) {
    console.error(`FAZ 0 contract FAILED: missing npm script ${key}`);
    process.exit(1);
  }
}
const doc = fs.readFileSync(new URL('../docs/FAZ_0_RELEASE_SAFETY_COMPLETION_V25.8.61_RC3.md', import.meta.url),'utf8');
if (!doc.includes('FAZ 0 KOD UYGULAMASI: TAMAMLANDI')) {
  console.error('FAZ 0 contract FAILED: completion record missing canonical status.');
  process.exit(1);
}
console.log('FAZ 0 contract PASS: canonical commands and completion record are present.');
