# Yenomi ID — Phase 2 Design System Foundation (v25.8.42)

## Amaç

Faz 2, ekranları yeniden tasarlamak için değil, bundan sonraki bütün Yenomi ID yüzeylerinin aynı görsel ve teknik temeli kullanabilmesi için canonical design system foundation kurmak için uygulanmıştır. Business logic, route yapısı, Supabase, RLS, iyzico, aktivasyon, QR/NFC ve organizasyon yetki modeli değiştirilmemiştir.

## Canonical source of truth

Yeni UI geliştirmelerinde yalnız `app/design-tokens.css` içindeki semantic tokenlar kullanılmalıdır:

- Color: `--background`, `--surface`, `--surface-secondary`, `--surface-elevated`, `--text-*`, `--border*`, `--primary*`, semantic success/warning/error/info.
- Radius: `--radius-xs/sm/md/lg/xl/full`.
- Shadow: `--shadow-xs/sm/md/overlay`.
- Spacing: 4/8/12/16/20/24/32/40/48/64/80/96/120.
- Typography, control heights, containers and motion aynı dosyada merkezidir.

`--yi-*`, `--yp-*`, `--brand-*`, `--store-*`, `--ui-*` ve `--y-*` artık yeni kod için API değildir. Bunlar yalnız mevcut ekranları route-by-route migrate ederken kırmamak için compatibility bridge olarak tutulur.

## Context sistemi

Tek design system, her yüzeyi aynı renge zorlamaz. Default context marketing/public yüzeylerinin mevcut koyu ürün bağlamını korur. `.yp-app-shell`, bireysel editor ve `[data-ui-context="dashboard"]` aynı semantic token isimlerini açık ve görev-odaklı dashboard yüzeylerine yeniden bağlar. Böylece Marketing / Commerce / Dashboard farklı yoğunlukta olabilir fakat aynı semantic API'yi konuşur.

## Reusable component foundation

`app/components/ui/DesignSystem.tsx` aşağıdaki temel componentleri sunar:

- Button + ButtonLink: primary / secondary / ghost / destructive / icon; sm/md/lg.
- Card: surface / interactive / highlight / metric.
- Badge: neutral / success / warning / error / info.
- PageHeader.
- Field, Input, Select, Textarea, Label, Checkbox, Switch.
- Container, Stack, Grid.
- EmptyState, Skeleton.
- Modal, Drawer, Tabs, Toast.
- DataTable.

Yeni route/component geliştirirken özel bir button/card/input yaratmadan önce bu foundation genişletilmelidir.

## İlk kontrollü migration

Mevcut `app/components/ui/States.tsx` public API'si korunmuş, içeride yeni foundation'a bağlanmıştır. Bu sayede onu kullanan admin, Siparişlerim ve kurumsal panel gibi ekranlar iş mantığı değiştirilmeden canonical EmptyState / LoadingState / PageHeader davranışına geçebilir.

## Bilerek yapılmayanlar

- `UserPanelShell` → yeni AppShell migration yapılmadı. Bu Faz 7'nin kontrollü route migration işidir.
- Public header/footer yapısal refactor yapılmadı. Faz 3/4 kapsamıdır.
- Legacy CSS dosyaları topluca silinmedi. Selector kullanımı sıfırlanmadan silmek regression riski yaratır.
- Kurumsal 3095 satırlık page componenti parçalanmadı. Corporate fazına aittir.
- Fiziksel kart/public profile artwork'leri zorla aynı surface temasına çevrilmedi.

## Migration kuralı

1. Yeni component canonical `ds-*` foundation ile oluşturulur.
2. Bir route kontrollü migrate edilir.
3. Typecheck + unit + visual + responsive regression çalıştırılır.
4. Eski selector/token kullanımı o route için sıfıra iner.
5. Legacy tanım ancak kullanım sıfırlandıktan sonra kaldırılır.

## Verification

```bash
npm run verify:phase1:audit
npm run verify:phase2:foundation
npm run test:critical
```

Dependency kurulmuş bir ortamda ayrıca:

```bash
npm run typecheck
npm run test:unit
npm run build
```


## Foundation hardening — v25.9.4

The foundation is now the active global layer for subsequent page work:

### Brand language
- `app/design-tokens.css` is the semantic token source for color, typography, radius, elevation, spacing, controls and motion.
- `app/design-system.css` owns the canonical reusable component treatment.
- Button hierarchy is explicit: `primary`, `secondary`, `secondary-strong`, `accent`, `ghost`, `destructive`, `icon`.
- Cards share one geometry/elevation contract with `surface`, `interactive`, `highlight` and `metric` variants.

### Icon language
- `app/icons.tsx` remains the single SVG icon source.
- Icons now expose `line` and `solid` treatments on the same optical grid.
- `yi-icon-badge` provides the filled-gold treatment for hero/feature emphasis without introducing a second icon library.
- Help Center topic icons were migrated from Unicode glyphs to the canonical icon source.

### Empty states
- `EmptyState` now provides a shared illustration + title + description + action composition.
- The same component is used for the empty cart and the Corporate Employees “Çalışan bulunamadı” state.
- `icon`, custom `illustration` and `compact` variants allow context-specific density without creating ad-hoc empty-state markup.

### Scope safety
No database model, Supabase/RLS logic, payment lifecycle, authentication flow or route contract was changed by this foundation pass.
