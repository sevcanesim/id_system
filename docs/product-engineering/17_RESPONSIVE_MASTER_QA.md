# Yenomi ID — Responsive Master QA

Status values are evidence-only: `PASS`, `FAIL`, `BLOCKED`, `NOT TESTED`.

## Scope inventory

| Route | Domain | 390×844 | 768×1024 | 1440×900 | Document overflow | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Public | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/urunler` | Public | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/urunler/nfc-kart` | Public | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/nasil-calisir` | Public | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/kurumsal` | Public | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/giris` | Public/Auth | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/sepet` | Commerce | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/checkout` | Commerce | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/odeme/basarili` | Commerce | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/odeme/basarisiz` | Commerce | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/hesabim` | Individual | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — authenticated fixture required |
| `/kartlarim` | Individual | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — authenticated fixture required |
| `/kartim` | Individual | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — authenticated fixture required |
| `/olustur` | Individual | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — authenticated fixture required |
| `/ayarlar` | Individual | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — authenticated fixture required |
| `/istatistikler` | Individual | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — authenticated fixture required |
| `/siparislerim` | Individual | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — authenticated fixture required |
| `/leadler` | Individual | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — authenticated fixture required |
| `/aktivasyon` | Individual/Auth | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| `/kurumsal/panel/*` | Corporate | BLOCKED | BLOCKED | BLOCKED | NOT TESTED | BLOCKED — isolated authenticated fixture required |

## Automated viewport matrix

Public and commerce routes are exercised at:

- 320×568
- 360×800
- 375×812
- 390×844
- 430×932
- 768×1024
- 820×1180
- 1024×1366
- 1280×800
- 1440×900
- 1512×982
- 1728×1117

Protected routes are also exercised unauthenticated at the critical 390×844, 768×1024 and 1440×900 boundaries to verify stable auth routing. That boundary test is not accepted as signed-in route QA.

## Validation checkpoints

- Canonical responsive source restored to the `main` baseline after a formatting-only normalization created false design-system diffs.
- Typography tokens and typography verifier are aligned with the enforced Design System Standard before browser validation.
- Final route statuses remain evidence-only and will be updated only from successful browser runs.

## Release rule

No route may move from `NOT TESTED` or `BLOCKED` to `PASS` without browser evidence. Signed-in individual/corporate routes require an isolated local or staging Supabase fixture; production seeding is prohibited.
