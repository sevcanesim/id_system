import fs from 'node:fs';

let fail = 0;
const pass = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) fail++;
};

const quality = fs.readFileSync('tests/e2e/quality-audit.spec.ts', 'utf8');
const phase13 = fs.readFileSync('tests/e2e/phase13-responsive-accessibility.spec.ts', 'utf8');
const visual = fs.readFileSync('tests/e2e/visual-regression.spec.ts', 'utf8');
const role = fs.readFileSync('tests/e2e/auth-role-matrix.spec.ts', 'utf8');
const states = fs.readFileSync('app/components/ui/States.tsx', 'utf8');
const corp = fs.readFileSync('app/kurumsal/panel/CorporatePanelClient.tsx', 'utf8');
const cards = fs.readFileSync('app/kartlarim/page.tsx', 'utf8');

const tokens = fs.readFileSync('app/design-tokens.css', 'utf8');
const publicCss = fs.readFileSync('app/public-conversion.css', 'utf8');
const authCss = fs.readFileSync('app/auth-flow.css', 'utf8');
const globals = fs.readFileSync('app/globals.css', 'utf8');
// `accessibility-responsive.css` was consolidated into `globals.css` (see CHANGELOG.md);
// this gate still pointed at the deleted file and crashed with ENOENT on every run.
const accessibilityCss = globals;

const requiredWidths = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440];
for (const width of requiredWidths) {
  pass(new RegExp(`width:\\s*${width}\\b`).test(quality) && new RegExp(`width:\\s*${width}\\b`).test(phase13), `responsive contract includes ${width}px`);
}

pass(/\["critical",\s*"serious"\]/.test(quality), 'authenticated accessibility blocks critical and serious violations');
pass(/authenticated mobile visual baselines/.test(visual), 'authenticated mobile visual suite exists');
pass(/individual-active-mobile/.test(visual), 'individual mobile visual baseline exists');
pass(/corporate-owner-mobile/.test(visual), 'corporate mobile visual baseline exists');
pass(/checkout-authenticated-mobile/.test(visual), 'authenticated checkout mobile visual baseline exists');
pass(/name: "checkout", path: "\/checkout"/.test(visual), 'public checkout is included in visual baselines');
pass(/demo\.kurumsal\.yonetici@yenomi\.test/.test(role) && /demo\.kurumsal\.admin@yenomi\.test/.test(role) && /demo\.ik\.yonetici@yenomi\.test/.test(role), 'role matrix covers owner/admin/hr management roles');
pass(/export function LoadingState/.test(states) && /FoundationEmptyState/.test(states), 'canonical loading and empty compatibility states remain available');
pass(/<LoadingState/.test(corp) && /<EmptyState/.test(corp), 'corporate critical surface uses canonical loading and empty states');
pass(/<EmptyState/.test(cards), 'individual cards surface uses canonical empty state');

// text-tertiary was darkened from #746f7b (4.56:1, a hair above the 4.5 AA floor) to
// #5f5a66 (6.24:1 on --background) during the color/theme contrast pass — real headroom
// instead of a borderline pass.
pass(/--text-tertiary:\s*#5f5a66/.test(tokens), 'canonical light tertiary text uses AA-safe contrast token with real headroom');
pass(publicCss.includes('var(--text-tertiary)'), 'public conversion tertiary text uses canonical tertiary token');
pass(authCss.includes('var(--text-tertiary)'), 'auth tertiary text uses canonical tertiary token');
pass(/color:#918b9a;font-size:8px/.test(globals), 'corporate sidebar section labels use strengthened contrast');
pass(/mobileNavigation\.isVisible\(\).*desktopNavigation\.isVisible\(\)/s.test(quality), 'tablet corporate navigation test validates visible navigation rather than hardcoded breakpoint');
pass(/seriousA11yViolations/.test(quality) && /failureSummary/.test(quality), 'accessibility failures emit concise selector-level diagnostics');
pass(/\.p4-public-home \.yi-footer :where\(p,small,a,\.yi-footer-bottom\)\{color:var\(--text-secondary\)!important\}/.test(accessibilityCss), 'public-home footer uses AA-safe light-surface copy via canonical token');
// `.catalog-card-price` is dead CSS: no route or component renders a `.catalog-page`/
// `.catalog-card` element (grep across app/**/*.tsx returns zero matches). The listing
// page now uses `.nfc-price-tag` (see nfc-product-page rule below), so this obsolete
// selector check has been retired rather than pinned to unreachable code.
pass(/\.nfc-product-page \.nfc-detail-strip strong\{color:#f6f4fa!important\}/.test(accessibilityCss), 'NFC detail labels are explicit high contrast');
pass(/\.p10-corporate-platform \.enterprise-side-user strong\{color:var\(--text-primary\)!important\}/.test(accessibilityCss), 'corporate light sidebar identity text is high contrast via canonical token');
pass(/enterprise-mobile-commandbar/.test(corp) && /@media\(max-width:980px\)[\s\S]*enterprise-mobile-commandbar/.test(globals), 'corporate mobile commandbar is enabled at the canonical mobile breakpoint');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionMatch = pkg.version.match(/^(\d+)\.(\d+)\.(\d+)/);
pass(Boolean(versionMatch) && Number(versionMatch[3]) >= 54, 'package version retains Phase 13 QA or later');

if (fail) process.exit(1);
console.log('\nFAZ 3 quality verification passed.');
