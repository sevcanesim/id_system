# Yenomi ID — Demo test kullanıcıları

Bu dosya elle tutulmaz. Kaynak `tests/fixtures/demo-user-matrix.ts` / `.mjs`.
Yenilemek için: `npm run docs:demo-users`.
`scripts/seed-demo-scenarios.mjs` aynı kaydı import eder.

Şifre git’e yazılmaz. Local apply için `.env.local` içinde `DEMO_SEED_PASSWORD` ve `ALLOW_LOCAL_DEMO_SEED=true`.
Production’da `@yenomi.test` hesabı olamaz (`verify:production:no-demo-users`).

## Giriş yapılabilen hesaplar

| Anahtar | E-posta | Tür | Portal | Şirket / Rol | Profil | Kart | QA niyeti |
|---|---|---|---|---|---|---|---|
| `superAdmin` | `demo.superadmin@yenomi.test` | SUPER_ADMIN | BOTH | - | - | - | Süper admin paneli ve her iki portal. |
| `cardPending` | `demo.card.pending@yenomi.test` | INDIVIDUAL_PENDING | INDIVIDUAL | - | Yok | - | İngilizce alias: bireysel profil henüz yok. |
| `cardComplete` | `demo.card.complete@yenomi.test` | INDIVIDUAL_COMPLETE | INDIVIDUAL | - | `demo-karti-hazir` | - | İngilizce alias: yayınlanmış bireysel kart. |
| `corp5Full` | `demo.corp5.full@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-5-tam (OWNER) | `demo-sirket-5-tam-yonetici` | `YN-DEMO5FULL001` (ACTIVE) | 5 koltuk, 0 boş — kapasite dolu. |
| `corp5Three` | `demo.corp5.three@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-5-iki-bos (OWNER) | `demo-sirket-5-iki-bos-yonetici` | - | 5 koltuktan 3 kullanılıyor, 2 boş. |
| `corp10Full` | `demo.corp10.full@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-10-tam (OWNER) | `demo-sirket-10-tam-yonetici` | - | 10 koltuk, 0 boş. |
| `corp2FullA` | `demo.corp2.full-a@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-2-tam-a (OWNER) | `demo-sirket-2-tam-a-yonetici` | - | 2 koltuk, 0 boş. |
| `corp2One` | `demo.corp2.one@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-2-bir-bos (OWNER) | `demo-sirket-2-bir-bos-yonetici` | - | 2 koltuktan 1 kullanılıyor. |
| `corp2Upgrade` | `demo.corp2.full-upgrade@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-2-upgrade (OWNER) | `demo-sirket-2-upgrade-yonetici` | - | Dolu 2’li paket; yükseltme satın alma yüzeyi. |
| `lifecycleOwner` | `demo.lifecycle.owner@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-yasam-dongusu (OWNER) | `demo-yasam-dongusu-yonetici` | - | Kart yaşam döngüsü org’unun sahibi. |
| `lifecycleNoCard` | `demo.lifecycle.nocard@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-yasam-dongusu (EMPLOYEE) | Yok | - | Aktif üye, dijital kart yok. |
| `lifecycleDigital` | `demo.lifecycle.digital@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-yasam-dongusu (EMPLOYEE) | `demo-lifecycle-digital` |  | Yayınlanmış dijital kart, fiziksel yok. |
| `lifecycleAssigned` | `demo.lifecycle.assigned@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-yasam-dongusu (EMPLOYEE) | `demo-lifecycle-assigned` | `YN-LIFEASSIGN01` (ACTIVE) | Aktif fiziksel kart atanmış. |
| `lifecycleLost` | `demo.lifecycle.lost@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-yasam-dongusu (EMPLOYEE) | `demo-lifecycle-lost` | `YN-LIFELOST0001` (LOST) | Kurumsal kayıp kart (YN-LIFELOST0001). |
| `lifecycleDisabled` | `demo.lifecycle.disabled@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-yasam-dongusu (EMPLOYEE) | `demo-lifecycle-disabled` | `YN-LIFEDISABL01` (DISABLED) | Fiziksel kart DISABLED. |
| `lifecycleSuspended` | `demo.lifecycle.suspended@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-yasam-dongusu (EMPLOYEE) | `demo-lifecycle-suspended` | `YN-LIFESUSPEND1` (DISABLED) | Üye SUSPENDED. |
| `lifecycleLeft` | `demo.lifecycle.left@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-yasam-dongusu (EMPLOYEE) | `demo-lifecycle-left` | `YN-LIFELEFT0001` (DISABLED) | Üye LEFT. |
| `trIndividualEmpty` | `demo.bireysel.bos@yenomi.test` | INDIVIDUAL_REGISTERED | INDIVIDUAL | - | Yok | - | Türkçe QA: yalnız portal kaydı; satın alma, kart, profil ve aktif hizmet yok. |
| `trIndividualActive` | `demo.bireysel.aktif@yenomi.test` | INDIVIDUAL_COMPLETE | INDIVIDUAL | - | `demo-bireysel-aktif` | - | Türkçe QA: yayınlanmış bireysel kart. |
| `trOwner` | `demo.kurumsal.yonetici@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-qa-uctan-uca (OWNER) | `qa-trowner` | - | Uçtan uca QA org OWNER. |
| `trAdmin` | `demo.kurumsal.admin@yenomi.test` | CORPORATE_ADMIN | CORPORATE | demo-qa-uctan-uca (ADMIN) | `qa-tradmin` | - | OWNER değil ADMIN. |
| `trHr` | `demo.ik.yonetici@yenomi.test` | CORPORATE_HR | CORPORATE | demo-qa-uctan-uca (HR) | `qa-trhr` | - | İK; lisans admin uydurulamaz. |
| `trRegistered` | `demo.calisan.kayit@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | Yok | - | Hesap var, profil yok. |
| `trNoCard` | `demo.calisan.kartyok@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | Yok | - | Aktif üye, kart oluşturulmadı. |
| `trDigital` | `demo.calisan.dijital@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trdigital` |  | Dijital kart hazır; duplicate-email prosedürünün hedefi. |
| `trAssigned` | `demo.calisan.atanmis@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trassigned` | `YN-TRASSIGN0001` (ACTIVE) | Fiziksel kart atanmış. |
| `trLost` | `demo.calisan.kayip@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trlost` | `YN-TRLOST000001` (LOST) | Kurumsal kayıp kart (YN-TRLOST000001). |
| `trBackup` | `demo.calisan.yedek@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trbackup` | `YN-TRBACKMAIN01` (ACTIVE), `YN-TRBACKALT001` (ACTIVE) | Ana + yedek kart (YN-TRBACKALT001). |
| `trSuspended` | `demo.calisan.pasif@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trsuspended` | `YN-TRSUSPEND001` (DISABLED) | Pasif çalışan yüzeyi. |
| `trLeft` | `demo.calisan.ayrildi@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trleft` | `YN-TRLEFT000001` (DISABLED) | İşten ayrılan çalışan yüzeyi. |
| `trFullOwner` | `demo.kurumsal.dolu@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-tam-kapasite (OWNER) | - | - | Türkçe QA: tam dolu şirket. |
| `trEmptyOwner` | `demo.kurumsal.bos@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-yeni-kurumsal (OWNER) | - | - | Owner-only boş şirket (demo-tr-yeni-kurumsal). |
| `trPartialOwner` | `demo.kurumsal.eksik@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-kismen-dolu (OWNER) | - | - | Kısmi doluluk (6/10). |
| `trTemplateOwner` | `demo.kurumsal.template@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-template (OWNER) | - | - | Kart şablonu kütüphanesi. |
| `trLeadOwner` | `demo.kurumsal.lead@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-lead (OWNER) | - | - | Lead modülü ürün boşluğu; tablo yok. |
| `multiOrgUser` | `demo.multi.org@yenomi.test` | MULTI_ORG_ADMIN | CORPORATE | demo-qa-uctan-uca (ADMIN) | `qa-multiorguser` | - | İki organizasyonda ADMIN. |
| `trIndividualPremium` | `demo.bireysel.premium@yenomi.test` | INDIVIDUAL_PREMIUM | INDIVIDUAL | - | `demo-bireysel-premium` | - | Premium SKU YENOMI-NFC-PREMIUM-ANNUAL, yayınlanmış profil. |
| `trIndividualExpired` | `demo.bireysel.suresi.dolmus@yenomi.test` | INDIVIDUAL_EXPIRED | INDIVIDUAL | - | `demo-bireysel-suresi-dolmus` | - | Entitlement EXPIRED; yenileme yüzeyi. |
| `trIndividualLost` | `demo.bireysel.kayip@yenomi.test` | INDIVIDUAL_LOST | INDIVIDUAL | - | `demo-bireysel-kayip` | `YN-INDLOST00001` (LOST) | Bireysel kayıp kart (YN-INDLOST00001). |
| `trIndividualBackup` | `demo.bireysel.yedek@yenomi.test` | INDIVIDUAL_BACKUP | INDIVIDUAL | - | `demo-bireysel-yedek` | `YN-INDYEDKMAIN1` (ACTIVE), `YN-INDYEDKALT01` (ACTIVE) | İki aktif bireysel kart (YN-INDYEDKMAIN1 / YN-INDYEDKALT01). |
| `trIndividualClaimMismatch` | `demo.bireysel.claim.mismatch@yenomi.test` | INDIVIDUAL_CLAIM_MISMATCH | INDIVIDUAL | - | Yok | - | Giriş yapabilir; misafir claim siparişinin sahibi değil. |
| `trIndividualForeign` | `demo.bireysel.yabanci@yenomi.test` | INDIVIDUAL_FOREIGN | INDIVIDUAL | - | Yok | - | Giriş var, ilk kart entitlement yok. |

## Misafir siparişleri (Auth yok)

Aktivasyon URL’si yalnız `seed:e2e` çıktısında bir kez basılır; token git’e yazılmaz.

| E-posta | Tür | Sipariş | SKU | QA niyeti |
|---|---|---|---|---|
| `demo.bireysel.aktivasyon.bekler@yenomi.test` | GUEST_ACTIVATION_PENDING | `YI-DEMO-GUEST-AKTIVASYON` | `YENOMI-NFC-CARD-ANNUAL` | PAID misafir siparişi; Auth yok; aktivasyon token’ı apply anında türetilir. |
| `demo.bireysel.claim.siparis@yenomi.test` | GUEST_CLAIM_MISMATCH_ORDER | `YI-DEMO-GUEST-CLAIM` | `YENOMI-NFC-CARD-ANNUAL` | Misafir e-posta siparişi; claim.mismatch kullanıcısı bunu sahiplenemez. |
| `demo.kurumsal.misafir.paid@yenomi.test` | GUEST_CORPORATE_PAID | `YI-DEMO-GUEST-CORP` | `YENOMI-CORP-2` | PAID kurumsal paket; tenant fulfill yok. |

## Davet fixture’ları (Auth yok)

| E-posta | Tür | Şirket | Rol | Durum | QA niyeti |
|---|---|---|---|---|---|
| `demo.calisan.davet@yenomi.test` | INVITE_PENDING | `demo-qa-uctan-uca` | EMPLOYEE | INVITED | Aktif davet; Auth user yok; login başarısız olmalı. |
| `demo.calisan.davet.expired@yenomi.test` | INVITE_EXPIRED | `demo-qa-uctan-uca` | EMPLOYEE | INVITED | Süresi dolmuş davet. |
| `demo.calisan.davet.revoked@yenomi.test` | INVITE_REVOKED | `demo-qa-uctan-uca` | EMPLOYEE | LEFT | İptal edilmiş davet. |
| `demo.lifecycle.invited@yenomi.test` | LIFECYCLE_INVITE_PENDING | `demo-yasam-dongusu` | EMPLOYEE | INVITED | Yaşam döngüsü org’unda INVITED, Auth yok. |

## Kapasite senaryoları

| Şirket | Plan | Koltuk |
|---|---|---|
| Demo Şirket 5 / Tam Dolu | DEMO-5 | 5/5 |
| Demo Şirket 5 / 2 Boş | DEMO-5 | 3/5 |
| Demo Şirket 10 / Tam Dolu | DEMO-10 | 10/10 |
| Demo Şirket 2 / Tam Dolu A | DEMO-2 | 2/2 |
| Demo Şirket 2 / 1 Boş | DEMO-2 | 1/2 |
| Demo Şirket 2 / Paket Satın Al | DEMO-2 | 2/2 |
| Demo Şirket / Kart Yaşam Döngüsü | DEMO-10 | 1/10 |

## Kimlik çarpışması

`demo.ayni.isim.*` adresleri görünen adı `Ahmet Yılmaz` olan ayrı üyelerdir. Aynı görünen ad, farklı e-posta; kimlik çarpışması.

## Apply

```bash
ALLOW_LOCAL_DEMO_SEED=true DEMO_SEED_PASSWORD='…' npm run seed:e2e
```

