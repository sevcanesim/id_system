# Yenomi ID — Demo test kullanıcıları

Bu dosya elle tutulmaz. Kaynak `tests/fixtures/demo-user-matrix.ts` / `.mjs`.
Yenilemek için: `npm run docs:demo-users`.
`scripts/seed-demo-scenarios.mjs` aynı kaydı import eder.

Şifre git’e yazılmaz. Local apply için `.env.local` içinde `DEMO_SEED_PASSWORD` ve `ALLOW_LOCAL_DEMO_SEED=true`.
Temiz kurulumda `--reset-demo`, tüm `@yenomi.test` hesaplarını, `TEST` kimlik katmanını ve bunlara bağlı demo verisini silip bu matrisi yeniden kurar; gerçek kullanıcı veya katalog verisine dokunmaz.
Production’da `@yenomi.test` hesabı olamaz (`verify:production:no-demo-users`).

## Giriş yapılabilen hesaplar

| Anahtar | E-posta | Tür | Portal | Şirket / Rol | Profil | Kart | QA niyeti |
|---|---|---|---|---|---|---|---|
| `superAdmin` | `qa26.superadmin@yenomi.test` | SUPER_ADMIN | BOTH | - | - | - | Süper admin paneli ve her iki portal. |
| `cardPending` | `qa26.card.pending@yenomi.test` | INDIVIDUAL_PENDING | INDIVIDUAL | - | Yok | - | İngilizce alias: bireysel profil henüz yok. |
| `cardComplete` | `qa26.card.complete@yenomi.test` | INDIVIDUAL_COMPLETE | INDIVIDUAL | - | `demo-karti-hazir` | `YN-INDCOMPLETE1` (ACTIVE) | İngilizce alias: yayınlanmış bireysel kart. |
| `corp5Full` | `qa26.corp5.full@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-5-tam (OWNER) | `demo-sirket-5-tam-yonetici` | `YN-DEMO5FULL001` (ACTIVE) | 5 koltuk, 0 boş — kapasite dolu. |
| `corp5Three` | `qa26.corp5.three@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-5-iki-bos (OWNER) | `demo-sirket-5-iki-bos-yonetici` | - | 5 koltuktan 3 kullanılıyor, 2 boş. |
| `corp10Full` | `qa26.corp10.full@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-10-tam (OWNER) | `demo-sirket-10-tam-yonetici` | - | 10 koltuk, 0 boş. |
| `corp2FullA` | `qa26.corp2.full-a@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-2-tam-a (OWNER) | `demo-sirket-2-tam-a-yonetici` | - | 2 koltuk, 0 boş. |
| `corp2One` | `qa26.corp2.one@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-2-bir-bos (OWNER) | `demo-sirket-2-bir-bos-yonetici` | - | 2 koltuktan 1 kullanılıyor. |
| `corp2Upgrade` | `qa26.corp2.full-upgrade@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-sirket-2-upgrade (OWNER) | `demo-sirket-2-upgrade-yonetici` | - | Dolu 2’li paket; yükseltme satın alma yüzeyi. |
| `trIndividualEmpty` | `qa26.bireysel.bos@yenomi.test` | INDIVIDUAL_REGISTERED | INDIVIDUAL | - | Yok | - | Türkçe QA: yalnız portal kaydı; satın alma, kart, profil ve aktif hizmet yok. |
| `trIndividualActive` | `qa26.bireysel.aktif@yenomi.test` | INDIVIDUAL_COMPLETE | INDIVIDUAL | - | `demo-bireysel-aktif` | `YN-INDACTIVE001` (ACTIVE) | Türkçe QA: yayınlanmış bireysel kart. |
| `trOwner` | `qa26.kurumsal.yonetici@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-qa-uctan-uca (OWNER) | `qa-trowner` | - | Uçtan uca QA org OWNER. |
| `trAdmin` | `qa26.kurumsal.admin@yenomi.test` | CORPORATE_ADMIN | CORPORATE | demo-qa-uctan-uca (ADMIN) | `qa-tradmin` | - | OWNER değil ADMIN. |
| `trHr` | `qa26.ik.yonetici@yenomi.test` | CORPORATE_HR | CORPORATE | demo-qa-uctan-uca (HR) | `qa-trhr` | - | İK; lisans admin uydurulamaz. |
| `departmentManager` | `qa26.departman.yonetici@yenomi.test` | CORPORATE_DEPARTMENT_MANAGER | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-department-manager` | - | Satış Departmanı yöneticisi görünümü. Departman-bazlı yetki modeli henüz veri şemasında ayrı bir rol değildir; bu hesap yetki açığını görünür kılar. |
| `trRegistered` | `qa26.calisan.kayit@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | Yok | - | Hesap var, profil yok. |
| `trNoCard` | `qa26.calisan.kartyok@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | Yok | - | Aktif üye, kart oluşturulmadı. |
| `trDigital` | `qa26.calisan.dijital@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trdigital` | - | Dijital kart hazır; duplicate-email prosedürünün hedefi. |
| `trAssigned` | `qa26.calisan.atanmis@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trassigned` | `YN-TRASSIGN0001` (ACTIVE) | Fiziksel kart atanmış. |
| `trLost` | `qa26.calisan.kayip@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trlost` | `YN-TRLOST000001` (LOST) | Kurumsal kayıp kart (YN-TRLOST000001). |
| `trBackup` | `qa26.calisan.yedek@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trbackup` | `YN-TRBACKMAIN01` (ACTIVE), `YN-TRBACKALT001` (ACTIVE) | Ana + yedek kart (YN-TRBACKALT001). |
| `trSuspended` | `qa26.calisan.pasif@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trsuspended` | `YN-TRSUSPEND001` (DISABLED) | Pasif çalışan yüzeyi. |
| `trLeft` | `qa26.calisan.ayrildi@yenomi.test` | CORPORATE_EMPLOYEE | CORPORATE | demo-qa-uctan-uca (EMPLOYEE) | `qa-trleft` | `YN-TRLEFT000001` (DISABLED) | İşten ayrılan çalışan yüzeyi. |
| `trFullOwner` | `qa26.kurumsal.dolu@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-tam-kapasite (OWNER) | - | - | Türkçe QA: tam dolu şirket. |
| `trEmptyOwner` | `qa26.kurumsal.bos@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-yeni-kurumsal (OWNER) | - | - | Owner-only boş şirket (demo-tr-yeni-kurumsal). |
| `trPartialOwner` | `qa26.kurumsal.eksik@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-kismen-dolu (OWNER) | - | - | Kısmi doluluk (6/10). |
| `trTemplateOwner` | `qa26.kurumsal.template@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-template (OWNER) | - | - | Kart şablonu kütüphanesi. |
| `trLeadOwner` | `qa26.kurumsal.lead@yenomi.test` | CORPORATE_OWNER | CORPORATE | demo-tr-lead (OWNER) | - | - | Lead modülü ürün boşluğu; tablo yok. |
| `multiOrgUser` | `qa26.multi.org@yenomi.test` | MULTI_ORG_ADMIN | CORPORATE | demo-qa-uctan-uca (ADMIN) | `qa-multiorguser` | - | İki organizasyonda ADMIN. |
| `trIndividualPremium` | `qa26.bireysel.premium@yenomi.test` | INDIVIDUAL_PREMIUM | INDIVIDUAL | - | `demo-bireysel-premium` | `YN-INDPREMIUM01` (ACTIVE) | Premium SKU YENOMI-NFC-PREMIUM-ANNUAL, yayınlanmış profil. |
| `trIndividualExpired` | `qa26.bireysel.suresi.dolmus@yenomi.test` | INDIVIDUAL_EXPIRED | INDIVIDUAL | - | `demo-bireysel-suresi-dolmus` | - | Entitlement EXPIRED; yenileme yüzeyi. |
| `trIndividualLost` | `qa26.bireysel.kayip@yenomi.test` | INDIVIDUAL_LOST | INDIVIDUAL | - | `demo-bireysel-kayip` | `YN-INDLOST00001` (LOST) | Bireysel kayıp kart (YN-INDLOST00001). |
| `trIndividualBackup` | `qa26.bireysel.yedek@yenomi.test` | INDIVIDUAL_BACKUP | INDIVIDUAL | - | `demo-bireysel-yedek` | `YN-INDYEDKMAIN1` (ACTIVE), `YN-INDYEDKALT01` (ACTIVE) | İki aktif bireysel kart (YN-INDYEDKMAIN1 / YN-INDYEDKALT01). |
| `trIndividualClaimMismatch` | `qa26.bireysel.claim.mismatch@yenomi.test` | INDIVIDUAL_CLAIM_MISMATCH | INDIVIDUAL | - | Yok | - | Giriş yapabilir; misafir claim siparişinin sahibi değil. |
| `trIndividualForeign` | `qa26.bireysel.yabanci@yenomi.test` | INDIVIDUAL_FOREIGN | INDIVIDUAL | - | Yok | - | Giriş var, ilk kart entitlement yok. |

## Misafir siparişleri (Auth yok)

Aktivasyon URL’si yalnız `seed:e2e` çıktısında bir kez basılır; token git’e yazılmaz.

| E-posta | Tür | Sipariş | SKU | QA niyeti |
|---|---|---|---|---|
| `qa26.bireysel.aktivasyon.bekler@yenomi.test` | GUEST_ACTIVATION_PENDING | `YI-DEMO-GUEST-AKTIVASYON` | `YENOMI-NFC-CARD-ANNUAL` | PAID misafir siparişi; Auth yok; aktivasyon token’ı apply anında türetilir. |
| `qa26.bireysel.claim.siparis@yenomi.test` | GUEST_CLAIM_MISMATCH_ORDER | `YI-DEMO-GUEST-CLAIM` | `YENOMI-NFC-CARD-ANNUAL` | Misafir e-posta siparişi; claim.mismatch kullanıcısı bunu sahiplenemez. |
| `qa26.kurumsal.misafir.paid@yenomi.test` | GUEST_CORPORATE_PAID | `YI-DEMO-GUEST-CORP` | `YENOMI-CORP-2` | PAID kurumsal paket; tenant fulfill yok. |

## Davet fixture’ları (Auth yok)

| E-posta | Tür | Şirket | Rol | Durum | QA niyeti |
|---|---|---|---|---|---|
| `qa26.calisan.davet@yenomi.test` | INVITE_PENDING | `demo-qa-uctan-uca` | EMPLOYEE | INVITED | Aktif davet; Auth user yok; login başarısız olmalı. |
| `qa26.calisan.davet.expired@yenomi.test` | INVITE_EXPIRED | `demo-qa-uctan-uca` | EMPLOYEE | INVITED | Süresi dolmuş davet. |
| `qa26.calisan.davet.revoked@yenomi.test` | INVITE_REVOKED | `demo-qa-uctan-uca` | EMPLOYEE | LEFT | İptal edilmiş davet. |

## Kapasite senaryoları

| Şirket | Plan | Koltuk |
|---|---|---|
| Demo Şirket 5 / Tam Dolu | CORP-5 | 5/5 |
| Demo Şirket 5 / 2 Boş | CORP-5 | 3/5 |
| Demo Şirket 10 / Tam Dolu | CORP-10 | 10/10 |
| Demo Şirket 2 / Tam Dolu A | CORP-2 | 2/2 |
| Demo Şirket 2 / 1 Boş | CORP-2 | 1/2 |
| Demo Şirket 2 / Paket Yükseltme | CORP-2 | 2/2 |

## Kimlik çarpışması

`qa26.ayni.isim.*` adresleri görünen adı `Ahmet Yılmaz` olan ayrı üyelerdir. Aynı görünen ad, farklı e-posta; kimlik çarpışması.

## Apply

```bash
ALLOW_LOCAL_DEMO_SEED=true DEMO_SEED_PASSWORD='…' npm run seed:demo -- --apply --reset-demo --allow-non-empty
```

