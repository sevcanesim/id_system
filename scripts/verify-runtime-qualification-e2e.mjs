import { spawnSync } from 'node:child_process';

const steps = [
  ['test:e2e', 'Core E2E'],
  ['test:quality', 'Quality E2E'],
  ['test:visual', 'Visual regression'],
  ['test:cross-browser', 'Cross-browser E2E'],
];

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const [scriptName, label] of steps) {
  console.log(`\n=== ${label}: ${scriptName} ===`);
  const result = spawnSync(npm, ['run', scriptName], { stdio: 'inherit', env: process.env });
  if (result.error) {
    console.error(`ERROR  ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`FAIL   ${label}`);
    process.exit(result.status ?? 1);
  }
  console.log(`PASS   ${label}`);
}

console.log('\nRuntime E2E qualification: PASS');
