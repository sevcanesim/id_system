# Yenomi ID — Coding Agent Instructions

Read these files before modifying the repository:

- `docs/product-engineering/00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md`
- `docs/product-engineering/01_CURRENT_ARCHITECTURE_BASELINE.md`
- `docs/product-engineering/16_AGENT_WORKING_CONTRACT.md`

Core rules:

- Inspect before changing.
- Preserve existing contracts.
- Find root causes instead of stacking overrides.
- Reuse the design system.
- No new global CSS.
- No new `!important`.
- No duplicate components.
- Public mockups: CSS/SVG specimens only; no AI raster.
- Side-by-side cards stretch to equal height.
- Canvas stays warm-light (`#F9F8F6`); foil/phone chrome may be dark.
- Keep business rules out of UI components.
- Server/database authorization is authoritative.
- No fake production functionality.
- Run tests yourself when possible.
- Fix failures and rerun them before reporting.
- Do not report blocked runtime checks as PASS.
- Stop on critical regression.
