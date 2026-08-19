import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function versionTuple(v) {
  return v.replace(/^v/, '').split('.').map(Number);
}

function satisfiesNode(v) {
  const [major, minor] = versionTuple(v);
  return major >= 20 && major < 23 && (major > 20 || minor >= 11);
}

const nodeVersion = process.version;
if (!satisfiesNode(nodeVersion)) {
  console.error(`BLOCKED Node ${nodeVersion} does not satisfy project engine >=20.11.0 <23`);
  console.error('Use the project-pinned Node version from .nvmrc before runtime qualification.');
  process.exit(2);
}

if (!existsSync('node_modules')) {
  console.error('BLOCKED node_modules is missing. Run npm ci before runtime qualification.');
  process.exit(2);
}

const required = [
  ['next', 'Next.js'],
  ['typescript/bin/tsc', 'TypeScript'],
  ['vitest/vitest.mjs', 'Vitest'],
  ['@playwright/test', 'Playwright'],
];

for (const [path, label] of required) {
  if (!existsSync(`node_modules/${path}`)) {
    console.error(`BLOCKED ${label} runtime is missing: node_modules/${path}`);
    process.exit(2);
  }
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['run', 'verify:runtime-qualification:inner'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
