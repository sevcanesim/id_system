import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readProjectRefFromLink() {
  for (const file of ['supabase/.temp/project-ref', '.supabase/project-ref']) {
    if (!fs.existsSync(file)) continue;
    const value = fs.readFileSync(file, 'utf8').trim();
    if (/^[a-z0-9]{10,}$/.test(value)) return value;
  }
  return '';
}

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[match[1]] = value;
  }
  return out;
}

function deriveProjectRef() {
  const local = parseEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || local.NEXT_PUBLIC_SUPABASE_URL || local.SUPABASE_URL || '';
  const match = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i);
  return match?.[1] || '';
}

const linkedRef = readProjectRefFromLink();
if (!linkedRef) {
  const derivedRef = deriveProjectRef();
  console.error('Supabase project link bulunamadı. Migration drift remote proje olmadan doğrulanamaz.');
  if (derivedRef) {
    console.error(`\n.env.local içindeki Supabase URL’den proje ref tespit edildi: ${derivedRef}`);
    console.error(`Önce şu komutu çalıştır:\n  npx supabase link --project-ref ${derivedRef}`);
  } else {
    console.error('\nÖnce Supabase Dashboard > Project Settings > General içindeki Project Ref ile şunu çalıştır:');
    console.error('  npx supabase link --project-ref <PROJECT_REF>');
  }
  console.error('CLI oturumu yoksa önce: npx supabase login');
  process.exit(1);
}

const result = spawnSync('npx', ['supabase', 'migration', 'list'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const output = `${result.stdout || ''}\n${result.stderr || ''}`;
if (result.status !== 0) {
  console.error(output.trim());
  console.error(`\nMigration drift kontrolü çalıştırılamadı. Linked project ref: ${linkedRef}`);
  console.error('Supabase CLI oturumunu doğrula: npx supabase login');
  process.exit(result.status || 1);
}

function cleanCell(value = '') {
  return value
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/`/g, '')
    .trim();
}

function parseMigrationRows() {
  const jsonLine = output.split(/\r?\n/).find((line) => line.trim().startsWith('{"migrations":'));
  if (jsonLine) {
    try {
      const payload = JSON.parse(jsonLine.trim());
      if (Array.isArray(payload.migrations)) {
        return payload.migrations
          .map(({ local = '', remote = '', time = '' }) => [String(local), String(remote), String(time)])
          .filter(([local, remote]) => /^\d{3,}$/.test(local) || /^\d{3,}$/.test(remote));
      }
    } catch {
      return [];
    }
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.replace(/\u001b\[[0-9;]*m/g, '').trim())
    .filter((line) => line.includes('|'))
    .map((line) => line.split('|').map(cleanCell))
    .filter((cells) => cells.length >= 2)
    .map(([local, remote, time = '']) => [local, remote, time])
    .filter(([local, remote]) => /^\d{3,}$/.test(local || '') || /^\d{3,}$/.test(remote || ''));
}

const rows = parseMigrationRows();

if (!rows.length) {
  console.error(output.trim());
  console.error('\nMigration drift kontrolü: Supabase migration tablosu parse edilemedi.');
  console.error('Supabase CLI çıktı formatı değişmiş olabilir; `npx supabase migration list` çıktısını incele.');
  process.exit(1);
}

const localVersions = new Set(rows.map(([local]) => local).filter(Boolean));
const remoteVersions = new Set(rows.map(([, remote]) => remote).filter(Boolean));
const localOnly = [...localVersions].filter((version) => !remoteVersions.has(version));
const remoteOnly = [...remoteVersions].filter((version) => !localVersions.has(version));
if (localOnly.length || remoteOnly.length) {
  console.error(`Migration drift bulundu: ${localOnly.length + remoteOnly.length} uyuşmazlık.`);
  for (const version of localOnly) console.error(`  LOCAL_ONLY  local=${version} remote=-`);
  for (const version of remoteOnly) console.error(`  REMOTE_ONLY local=- remote=${version}`);
  console.error('\nBu durumda otomatik `db push` veya `migration repair` çalıştırma.');
  console.error('Önce local-only ve remote-only migrationların aynı şema değişikliklerinin yeniden adlandırılmış sürümleri olup olmadığını doğrula.');
  process.exit(1);
}

console.log(`Migration drift kontrolü BAŞARILI: ${localVersions.size} local/remote migration sürümü eşleşiyor. Project ref: ${linkedRef}`);
