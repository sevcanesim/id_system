import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'app', 'CardTemplate.tsx');
const source = fs.readFileSync(file, 'utf8');

const checks = [
  ['contact links are sourced from generated direct-contact data', /const contactLinks = generatedLinks\.filter\(\(link\) => link\.kind === "phone" \|\| link\.kind === "mail" \|\| link\.kind === "map"\)/],
  ['corporate external managed links are not injected into contact section', /const contactLinks = generatedLinks\.filter/],
  ['direct contact section excludes website/corporate external links', /const directContacts = generatedLinks\.filter\(\(link\) => \["phone", "mail", "map"\]\.includes\(link\.kind\)\)/],
  ['corporate links remain rendered by managed-links section', /const managedLinks = data\.links \?\? \[\]/],
  ['professional corporate links section remains present', /className="corp-professional-company"/],
  ['executive resources section remains present', /className="corp-executive-resources"/],
];

let failed = 0;
for (const [label, pattern] of checks) {
  const ok = pattern.test(source);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`);
  if (!ok) failed++;
}

const cssFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(css|scss)$/.test(entry.name)) cssFiles.push(full);
  }
}
walk(root);
const importantCount = cssFiles.reduce((sum, filePath) => {
  return sum + (fs.readFileSync(filePath, 'utf8').match(/!important\b/g) || []).length;
}, 0);
console.log(`INFO — !important count: ${importantCount}`);
process.exit(failed ? 1 : 0);
