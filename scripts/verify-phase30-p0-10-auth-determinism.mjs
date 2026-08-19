import fs from 'node:fs';

const guard = fs.readFileSync('lib/auth/portal-guard.ts', 'utf8');
const login = fs.readFileSync('app/giris/page.tsx', 'utf8');

const checks = [
  ['bounded portal validation attempts', /PORTAL_VALIDATION_ATTEMPTS\s*=\s*3/],
  ['bounded retry delay', /PORTAL_VALIDATION_DELAY_MS\s*=\s*250/],
  ['maybeSingle avoids false missing-row failure', /\.maybeSingle\(\)/],
  ['retry loop exists', /for \(let attempt = 0; attempt < PORTAL_VALIDATION_ATTEMPTS/],
  ['retry delay is progressive and bounded', /PORTAL_VALIDATION_DELAY_MS \* \(attempt \+ 1\)/],
  ['fail closed after retry budget', /Hesap türü doğrulanamadı/],
  ['login still validates portal after auth', /validatePortal\(supabase, result\.data\.session\.user\.id, portal\)/],
  ['credentials cleared before portal work', /setPassword\(""\);\n\s*setTransitioning\(true\);/],
];
let failed = 0;
for (const [name, re] of checks) {
  if (!re.test(name.includes('login still') || name.includes('credentials') ? login : guard)) console.error(`FAIL: ${name}`), failed++;
  else console.log(`PASS: ${name}`);
}
process.exitCode = failed ? 1 : 0;
