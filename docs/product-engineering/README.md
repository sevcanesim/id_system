# Yenomi ID — Product Engineering System

This directory is the project-level operating contract for product and engineering work.

## Reading order

1. `00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md` — governing rules
2. `01_CURRENT_ARCHITECTURE_BASELINE.md` — current repository reality
3. `16_AGENT_WORKING_CONTRACT.md` — concise agent execution rules
4. Run `npm run verify:runtime-prerequisites` before runtime tests when dependencies are available.
5. Existing phase/QA documents in `/docs` — detailed historical and phase-specific contracts
6. Parked product notes (`17_PARKED_*.md`) are **not** active contracts. Apply them only when the product owner says `notu uygula`.
7. `18_USER_IDENTITY_TYPES.md` — user product family, occupancy, and package typing.

## Source of truth

The codebase remains the implementation source of truth. These documents describe how changes must be made and verified; they do not override working production behavior without an explicit product/architecture decision.

## Rule

Do not create a second product-engineering contract elsewhere in the repository. Update these documents when the governing contract changes.
