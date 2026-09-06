# Yenomi ID — Phase 20 Production Release Candidate 3 (v25.8.61-rc.3)

RC3 is the final unit-contract reconciliation hotfix after the full unit suite exposed test-contract drift created by the Phase 16 component split and Phase 3/14 CSS ownership cleanup.

## Changes

- Unit tests now read `CorporatePanelClient.tsx` / extracted corporate components instead of the `page.tsx` re-export shell.
- Tests no longer require intentionally removed `storefront.css` or `brand-system.css`; they read the canonical current CSS owners.
- Corporate CSV, analytics, templates, links, role matrix, organization rename, branding, seat packs and fullscreen/sign-out contracts are validated against their real component owners.
- Final Phase 6 auth terminology and state classes are reflected in tests instead of legacy copy/class names.
- Landing-page tests validate the current Phase 4 benefit language rather than superseded copy/tracking hooks.
- Corporate employee profile editor again explains that editable identity changes are visible to HR.
- Rejected title requests and the HR note are visible in the employee card editor.

## Promotion rule

RC3 is not stable until the complete unit suite, typecheck, production build, Phase 19 browser suite and Phase 20 staging/production gates pass in the target environment.


## RC3 delta

- Final five stale assertions reconciled with canonical architecture.
- CSV bulk invite gains a real accessible row preview table before submission.
- Shared Skeleton, portal return-path, pathname tab routing and AppShell email-support contracts are now tested at their actual owners.


## P0 runtime promotion hardening

- The staging GitHub Actions workflow now runs the canonical `verify:phase20:staging` gate rather than the generic staging suite.
- Staging promotion requires explicit staging site URL, PayTR sandbox credentials and production URL isolation inputs.
- Phase 19 authenticated browser regression is therefore a mandatory staging promotion dependency.
- Runtime evidence must be recorded in `docs/RC3_RUNTIME_PROMOTION_CHECKLIST.md`; static review must not mark these checks as passed.
