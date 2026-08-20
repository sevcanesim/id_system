import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
let failed = false;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed = true; console.log(`FAIL  ${m}`); };
const info = (m) => console.log(`INFO  ${m}`);

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 20 && nodeMajor < 23) pass(`Node ${process.versions.node} satisfies project engine`);
else fail(`Node ${process.versions.node} does not satisfy project engine >=20.11.0 <23`);

const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
const npmMajor = Number(npmVersion.split('.')[0]);
if (npmMajor >= 10) pass(`npm ${npmVersion} satisfies project engine`);
else fail(`npm ${npmVersion} does not satisfy project engine >=10`);

if (fs.existsSync('node_modules')) pass('node_modules directory exists');
else fail('node_modules directory is missing; install dependencies before runtime verification');

const requiredBinaries = [
  ['next', 'node_modules/next/dist/bin/next'],
  ['vitest', 'node_modules/vitest/vitest.mjs'],
  ['tsc', 'node_modules/typescript/bin/tsc'],
];
for (const [name, file] of requiredBinaries) {
  fs.existsSync(file) ? pass(`${name} runtime is installed`) : fail(`${name} runtime is missing`);
}
fs.existsSync('node_modules/@playwright/test/cli.js')
  ? info('Playwright remains installed for local QA helpers; it is not a release gate')
  : info('Playwright is absent; local browser QA helpers will not run');

const lockRoot = lock.packages?.[''];
if (lockRoot?.version === pkg.version) pass(`package-lock root version matches ${pkg.version}`);
else fail(`package-lock root version does not match package.json ${pkg.version}`);

for (const dep of ['next', 'react', 'react-dom', 'typescript', 'vitest', '@types/node', '@types/react', '@types/react-dom', '@types/qrcode', 'qrcode']) {
  const locked = lock.packages?.[`node_modules/${dep}`]?.version;
  locked ? pass(`${dep} locked at ${locked}`) : fail(`${dep} is missing from package-lock`);
}

if (fs.existsSync('node_modules')) {
  info('Runtime prerequisite check is capable of supporting typecheck/unit/build verification.');
} else {
  info('Runtime checks are BLOCKED until dependencies are installed; this is not an application defect by itself.');
}

if (failed) process.exit(1);
console.log('\nRuntime prerequisites: PASS');
