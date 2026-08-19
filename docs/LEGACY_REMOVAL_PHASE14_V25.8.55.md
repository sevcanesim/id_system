# Yenomi ID — Phase 14 Legacy Removal

Phase 14 removes compatibility code only after active source usage is migrated.

## Removed
- `app/panel-system.css` and its root import.
- The obsolete `--yp-*` compatibility token family.
- Dead `individual-*` editor CSS from `globals.css` after source usage reached zero.
- Legacy `dashboard-*` and `yp-*` class usage from the individual Kartım route.
- Visible “HESAP KONTROLÜ” loading UI in CardWizard.
- `qr.css` imports from public identity routes now fully owned by Phase 12.

## Migrated ownership
- Kartım visual ownership -> `dashboard-flow.css` (`p14-*`).
- Corporate CardWizard navigation/loading -> `profile-editor.css`.
- Public profile watermark -> `public-card.css`.

## Intentionally retained
`legacy-surfaces.css`, `globals.css`, and `qr.css` still contain active legacy selectors used by admin, NFC order artwork, corporate preview templates, global header/footer and other routes. They must not be deleted wholesale until literal/runtime ownership reaches zero and visual regression confirms removal.
