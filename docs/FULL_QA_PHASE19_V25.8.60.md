# Yenomi ID — Phase 19 Full QA / Regression / Edge Cases

Phase 19 is a qualification and hardening phase, not a feature expansion.

## P0 defect fixed

Organization member suspension/offboarding previously updated `card_profiles` by `user_id` only. A user who owned both a corporate profile and an unrelated personal/other-company profile could therefore have unrelated profiles suspended. Corporate profiles are now explicitly bound to `organization_id`; organization lifecycle changes affect only the profile belonging to that organization. Corporate profiles also require organization context when edited, preventing an individual-editor bypass of company field policies.

## Regression matrix

- checkout idempotency and callback replay
- paid-but-fulfillment-review state
- renewal expiry + grace extension
- seat reservation serialization at the subscription row
- invite expiry / used-token / email mismatch handling
- member ACTIVE / SUSPENDED / LEFT lifecycle
- personal-vs-corporate profile isolation
- lost/disabled/replacement physical-card terminal behavior
- individual workspace routing without account-check UI
- corporate employee/card route smoke
- public route runtime errors and horizontal overflow

## Runtime qualification

`npm run test:phase19` runs the focused Phase 19 Vitest contract suite and Playwright critical regression suite. Seeded authenticated Playwright cases require the normal demo seed password/environment. Phase 20 staging should run the full release/integration/visual/cross-browser gates plus real iyzico Sandbox callback qualification.
