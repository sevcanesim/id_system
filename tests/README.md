# Test Suite Reset

Canonical demo users live in `tests/fixtures/demo-user-matrix.ts`. Do not invent parallel `@yenomi.test` accounts.

The previous legacy unit, E2E, accessibility, cross-browser, and visual-regression suites were intentionally removed.

The rebuilt baseline currently includes unit coverage for payment-attempt reuse,
corporate lifecycle states, and package rules, plus focused Playwright critical
journeys in `tests/e2e`.

Planned layers:
- Unit / domain tests (Vitest)
- API / integration tests
- Critical user-journey E2E tests (Playwright)
- Accessibility checks
- Responsive checks
- Visual regression baselines
- Production smoke tests

No legacy test or snapshot baseline is authoritative anymore.
