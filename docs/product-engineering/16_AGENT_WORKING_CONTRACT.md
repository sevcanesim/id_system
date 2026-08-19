# Yenomi ID — Agent Working Contract

This file is the concise operational contract for any coding agent working in this repository.

## Before coding

- Read `docs/product-engineering/00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md`.
- Read `docs/product-engineering/01_CURRENT_ARCHITECTURE_BASELINE.md`.
- Inspect the affected files, imports, routes, APIs, database contracts, CSS owners and tests.
- Search for an existing component/service/utility before creating a new one.
- Identify root cause before adding a workaround.

## While coding

- Preserve existing production behavior unless the task explicitly changes it.
- Prefer the existing design system.
- Do not create duplicate components.
- Do not add new global CSS for feature work.
- Do not add `!important`.
- Do not add business rules to UI components.
- Do not trust client-side prices, permissions, payment results or entitlement state.
- Keep server/API/database authorization authoritative.
- Do not create fake production functionality.
- Avoid opportunistic refactors.

## After coding

Run the most relevant available checks yourself.

If a check fails:

1. inspect the full failure
2. classify implementation/test/environment/dependency/data/migration/infrastructure
3. fix the root cause where possible
4. rerun the targeted check
5. run relevant regression checks
6. report any remaining blocker honestly

Never call `BLOCKED` a `PASS`.
Never weaken a test just to make it pass.

## Completion

A task is complete only after implementation, targeted verification, regression review and QA status are documented.
