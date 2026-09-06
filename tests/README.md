# Test Suite

Canonical demo users live in `tests/fixtures/demo-user-matrix.ts`. Do not invent parallel `@yenomi.test` accounts.

Legacy test and snapshot baselines are not authoritative. The active suite contains
Vitest domain/API coverage and focused Playwright critical journeys in `tests/e2e`:
public hydration, conversion CTAs, sales-copy contracts, responsive layouts, and
credential-gated individual/corporate visual routes.

Run `npm run test:unit` for unit tests, `npm run test:e2e` for Playwright, and
`node scripts/verify-critical-journeys-coverage.mjs` for the static E2E coverage
contract. A passing contract only confirms that the test sources exist; it does
not substitute for a PayTR sandbox payment, entitlement, activation, or a
credentialed staging run.
