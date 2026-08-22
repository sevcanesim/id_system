import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const archive = path.join(root, 'release', `${pkg.name}-v${pkg.version}-source.zip`);
const maxBytes = Number(process.env.RELEASE_MAX_BYTES || 20 * 1024 * 1024);

function fail(message) { console.error(`Release artifact BAŞARISIZ: ${message}`); process.exit(1); }
if (!fs.existsSync(archive)) fail(`Archive bulunamadı: ${path.relative(root, archive)}. Önce npm run release:package çalıştırın.`);
const size = fs.statSync(archive).size;
if (size > maxBytes) fail(`Archive ${Math.ceil(size / 1024 / 1024)} MB; budget ${Math.ceil(maxBytes / 1024 / 1024)} MB.`);

const listing = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const forbidden = [/(^|\/)node_modules\//, /(^|\/)\.next\//, /(^|\/)playwright-report\//, /(^|\/)test-results\//, /(^|\/)coverage\//, /(^|\/)\.vercel(\/|$)/, /(^|\/)\.env(?!\.example(?:$|\/))(?:$|\.)/];
const leaked = listing.filter((name) => forbidden.some((re) => re.test(name)));
if (leaked.length) fail(`Yasak release girdileri bulundu: ${leaked.slice(0, 10).join(', ')}`);
const manifestEntry = listing.find((name) => /\/RELEASE_MANIFEST\.json$/.test(name));
if (!manifestEntry) fail('RELEASE_MANIFEST.json bulunamadı.');
console.log(`Release artifact BAŞARILI: ${(size / 1024 / 1024).toFixed(2)} MB / ${(maxBytes / 1024 / 1024).toFixed(0)} MB budget.`);
