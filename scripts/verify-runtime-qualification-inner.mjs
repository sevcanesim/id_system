import { spawnSync } from 'node:child_process';

const steps = [
  ['verify:product-engineering', 'Product engineering contract'],
  ['verify:css-architecture', 'CSS architecture'],
  ['verify:route-css-imports', 'Route CSS ownership'],
  ['verify:react-runtime-imports', 'React runtime imports'],
  ['verify:field-control-types', 'Field control types'],
  ['verify:tsx-link-imports', 'TSX link imports'],
  ['verify:phase18:payment', 'Phase 18 payment lifecycle'],
  ['verify:phase19:qa', 'Phase 19 QA contract'],
  ['verify:phase21:product-variant', 'Phase 21 product variant'],
  ['verify:phase22:guest-checkout', 'Phase 22 guest checkout'],
  ['verify:http-only-session', 'HttpOnly Supabase session'],
  ['typecheck', 'TypeScript'],
  ['test:unit', 'Unit tests'],
  ['build', 'Next.js production build'],
  ['test:phase19', 'Phase 19 runtime regression'],
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

console.log('\nRuntime qualification: PASS');
