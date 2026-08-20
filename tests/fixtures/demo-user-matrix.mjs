/**
 * Canonical demo QA registry.
 * Seed, docs, and verifiers import this file. Do not invent parallel demo emails.
 * Never import this module from `app/` — production must not ship demo fixtures.
 */

export const DEMO_LOGIN_USERS = [
  { key: "superAdmin", email: "demo.superadmin@yenomi.test", name: "Demo Super Admin", kind: "SUPER_ADMIN", loginScope: "BOTH", intent: "Süper admin paneli ve her iki portal." },
  { key: "cardPending", email: "demo.card.pending@yenomi.test", name: "Kart Bilgisi Bekleyen", kind: "INDIVIDUAL_PENDING", loginScope: "INDIVIDUAL", intent: "İngilizce alias: bireysel profil henüz yok." },
  { key: "cardComplete", email: "demo.card.complete@yenomi.test", name: "Kartı Hazır Kullanıcı", kind: "INDIVIDUAL_COMPLETE", loginScope: "INDIVIDUAL", intent: "İngilizce alias: yayınlanmış bireysel kart." },
  { key: "corp5Full", email: "demo.corp5.full@yenomi.test", name: "Demo 5 Tam Dolu", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "5 koltuk, 0 boş — kapasite dolu." },
  { key: "corp5Three", email: "demo.corp5.three@yenomi.test", name: "Demo 5 İki Boş", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "5 koltuktan 3 kullanılıyor, 2 boş." },
  { key: "corp10Full", email: "demo.corp10.full@yenomi.test", name: "Demo 10 Tam Dolu", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "10 koltuk, 0 boş." },
  { key: "corp2FullA", email: "demo.corp2.full-a@yenomi.test", name: "Demo 2 Tam Dolu A", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "2 koltuk, 0 boş." },
  { key: "corp2One", email: "demo.corp2.one@yenomi.test", name: "Demo 2 Bir Boş", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "2 koltuktan 1 kullanılıyor." },
  { key: "corp2Upgrade", email: "demo.corp2.full-upgrade@yenomi.test", name: "Demo 2 Paket Yükseltme", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "Dolu 2’li paket; yükseltme satın alma yüzeyi." },
  { key: "lifecycleOwner", email: "demo.lifecycle.owner@yenomi.test", name: "Demo Yaşam Döngüsü Yöneticisi", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "Kart yaşam döngüsü org’unun sahibi." },
  { key: "lifecycleNoCard", email: "demo.lifecycle.nocard@yenomi.test", name: "Aktif Hesap Kart Yok", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Aktif üye, dijital kart yok." },
  { key: "lifecycleDigital", email: "demo.lifecycle.digital@yenomi.test", name: "Dijital Kart Hazır", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Yayınlanmış dijital kart, fiziksel yok." },
  { key: "lifecycleAssigned", email: "demo.lifecycle.assigned@yenomi.test", name: "Kart Atanmış Kullanıcı", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Aktif fiziksel kart atanmış." },
  { key: "lifecycleLost", email: "demo.lifecycle.lost@yenomi.test", name: "Kayıp Kart Kullanıcısı", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Kurumsal kayıp kart (YN-LIFELOST0001)." },
  { key: "lifecycleDisabled", email: "demo.lifecycle.disabled@yenomi.test", name: "Devre Dışı Kart Kullanıcısı", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Fiziksel kart DISABLED." },
  { key: "lifecycleSuspended", email: "demo.lifecycle.suspended@yenomi.test", name: "Pasif Çalışan", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Üye SUSPENDED." },
  { key: "lifecycleLeft", email: "demo.lifecycle.left@yenomi.test", name: "Ayrılmış Çalışan", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Üye LEFT." },
  { key: "trIndividualEmpty", email: "demo.bireysel.bos@yenomi.test", name: "Bireysel Profil Bekleyen", kind: "INDIVIDUAL_PENDING", loginScope: "INDIVIDUAL", intent: "Türkçe QA: ödenmiş, profil henüz yok." },
  { key: "trIndividualActive", email: "demo.bireysel.aktif@yenomi.test", name: "Bireysel Aktif Kullanıcı", kind: "INDIVIDUAL_COMPLETE", loginScope: "INDIVIDUAL", intent: "Türkçe QA: yayınlanmış bireysel kart." },
  { key: "trOwner", email: "demo.kurumsal.yonetici@yenomi.test", name: "Kurumsal Yönetici", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "Uçtan uca QA org OWNER." },
  { key: "trAdmin", email: "demo.kurumsal.admin@yenomi.test", name: "Kurumsal Admin", kind: "CORPORATE_ADMIN", loginScope: "CORPORATE", intent: "OWNER değil ADMIN." },
  { key: "trHr", email: "demo.ik.yonetici@yenomi.test", name: "İnsan Kaynakları Yöneticisi", kind: "CORPORATE_HR", loginScope: "CORPORATE", intent: "İK; lisans admin uydurulamaz." },
  { key: "trDepartmentManager", email: "demo.departman.yonetici@yenomi.test", name: "Departman Yöneticisi", kind: "DEPARTMENT_MANAGER", loginScope: "CORPORATE", intent: "Satış kapsamlı departman yöneticisi." },
  { key: "trRegistered", email: "demo.calisan.kayit@yenomi.test", name: "Hesabını Oluşturmuş Çalışan", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Hesap var, profil yok." },
  { key: "trNoCard", email: "demo.calisan.kartyok@yenomi.test", name: "Dijital Kartı Oluşturulmamış", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Aktif üye, kart oluşturulmadı." },
  { key: "trDigital", email: "demo.calisan.dijital@yenomi.test", name: "Dijital Kart Hazır", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Dijital kart hazır; duplicate-email prosedürünün hedefi." },
  { key: "trAssigned", email: "demo.calisan.atanmis@yenomi.test", name: "Fiziksel Kart Atanmış", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Fiziksel kart atanmış." },
  { key: "trLost", email: "demo.calisan.kayip@yenomi.test", name: "Kayıp Kart", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Kurumsal kayıp kart (YN-TRLOST000001)." },
  { key: "trBackup", email: "demo.calisan.yedek@yenomi.test", name: "Yedek Kartlı Kullanıcı", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Ana + yedek kart (YN-TRBACKALT001)." },
  { key: "trSuspended", email: "demo.calisan.pasif@yenomi.test", name: "Pasif Çalışan", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "Pasif çalışan yüzeyi." },
  { key: "trLeft", email: "demo.calisan.ayrildi@yenomi.test", name: "İşten Ayrılan Çalışan", kind: "CORPORATE_EMPLOYEE", loginScope: "CORPORATE", intent: "İşten ayrılan çalışan yüzeyi." },
  { key: "trFullOwner", email: "demo.kurumsal.dolu@yenomi.test", name: "Tam Kapasite Şirket Yöneticisi", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "Türkçe QA: tam dolu şirket." },
  { key: "trEmptyOwner", email: "demo.kurumsal.bos@yenomi.test", name: "Yeni Kurumsal Müşteri", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "Owner-only boş şirket (demo-tr-yeni-kurumsal)." },
  { key: "trPartialOwner", email: "demo.kurumsal.eksik@yenomi.test", name: "Kısmen Dolu Şirket Yöneticisi", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "Kısmi doluluk (6/10)." },
  { key: "trTemplateOwner", email: "demo.kurumsal.template@yenomi.test", name: "Şablon Test Yöneticisi", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "Kart şablonu kütüphanesi." },
  { key: "trLeadOwner", email: "demo.kurumsal.lead@yenomi.test", name: "Lead Test Yöneticisi", kind: "CORPORATE_OWNER", loginScope: "CORPORATE", intent: "Lead modülü ürün boşluğu; tablo yok." },
  { key: "multiOrgUser", email: "demo.multi.org@yenomi.test", name: "İki Şirketli Yönetici", kind: "MULTI_ORG_ADMIN", loginScope: "CORPORATE", intent: "İki organizasyonda ADMIN." },
  { key: "trIndividualPremium", email: "demo.bireysel.premium@yenomi.test", name: "Bireysel Premium Kullanıcı", kind: "INDIVIDUAL_PREMIUM", loginScope: "INDIVIDUAL", intent: "Premium SKU YENOMI-NFC-PREMIUM-ANNUAL, yayınlanmış profil." },
  { key: "trIndividualExpired", email: "demo.bireysel.suresi.dolmus@yenomi.test", name: "Süresi Dolmuş Bireysel", kind: "INDIVIDUAL_EXPIRED", loginScope: "INDIVIDUAL", intent: "Entitlement EXPIRED; yenileme yüzeyi." },
  { key: "trIndividualLost", email: "demo.bireysel.kayip@yenomi.test", name: "Kayıp Kart Bireysel", kind: "INDIVIDUAL_LOST", loginScope: "INDIVIDUAL", intent: "Bireysel kayıp kart (YN-INDLOST00001)." },
  { key: "trIndividualBackup", email: "demo.bireysel.yedek@yenomi.test", name: "Yedek Kart Bireysel", kind: "INDIVIDUAL_BACKUP", loginScope: "INDIVIDUAL", intent: "İki aktif bireysel kart (YN-INDYEDKMAIN1 / YN-INDYEDKALT01)." },
  { key: "trIndividualClaimMismatch", email: "demo.bireysel.claim.mismatch@yenomi.test", name: "Claim Eşleşmeyen Kullanıcı", kind: "INDIVIDUAL_CLAIM_MISMATCH", loginScope: "INDIVIDUAL", intent: "Giriş yapabilir; misafir claim siparişinin sahibi değil." },
  { key: "trIndividualForeign", email: "demo.bireysel.yabanci@yenomi.test", name: "Yabancı Checkout Kullanıcısı", kind: "INDIVIDUAL_FOREIGN", loginScope: "INDIVIDUAL", intent: "Giriş var, ilk kart entitlement yok." },
];

export const DEMO_GUEST_ORDERS = [
  { email: "demo.bireysel.aktivasyon.bekler@yenomi.test", kind: "GUEST_ACTIVATION_PENDING", audience: "individual", orderNumber: "YI-DEMO-GUEST-AKTIVASYON", tokenLabel: "guest-activation", intent: "PAID misafir siparişi; Auth yok; aktivasyon token’ı apply anında türetilir." },
  { email: "demo.bireysel.claim.siparis@yenomi.test", kind: "GUEST_CLAIM_MISMATCH_ORDER", audience: "individual", orderNumber: "YI-DEMO-GUEST-CLAIM", tokenLabel: "guest-claim-mismatch", intent: "Misafir e-posta siparişi; claim.mismatch kullanıcısı bunu sahiplenemez." },
  { email: "demo.kurumsal.misafir.paid@yenomi.test", kind: "GUEST_CORPORATE_PAID", audience: "corporate", orderNumber: "YI-DEMO-GUEST-CORP", tokenLabel: "guest-corporate", intent: "PAID kurumsal paket; tenant fulfill yok." },
];

export const DEMO_INVITE_FIXTURES = [
  { email: "demo.calisan.davet@yenomi.test", kind: "INVITE_PENDING", intent: "Aktif davet; Auth user yok; login başarısız olmalı." },
  { email: "demo.calisan.davet.expired@yenomi.test", kind: "INVITE_EXPIRED", intent: "Süresi dolmuş davet." },
  { email: "demo.calisan.davet.revoked@yenomi.test", kind: "INVITE_REVOKED", intent: "İptal edilmiş davet." },
  { email: "demo.lifecycle.invited@yenomi.test", kind: "LIFECYCLE_INVITE_PENDING", intent: "Yaşam döngüsü org’unda INVITED, Auth yok." },
];

export const DEMO_IDENTITY_COLLISION = {
  displayName: "Ahmet Yılmaz",
  emailPrefix: "demo.ayni.isim.",
  intent: "Aynı görünen ad, farklı e-posta; kimlik çarpışması.",
};

export const DEMO_CORPORATE_CAPACITY_SCENARIOS = [
  { owner: "corp5Full", slug: "demo-sirket-5-tam", name: "Demo Şirket 5 / Tam Dolu", plan: "DEMO-5", limit: 5, used: 5 },
  { owner: "corp5Three", slug: "demo-sirket-5-iki-bos", name: "Demo Şirket 5 / 2 Boş", plan: "DEMO-5", limit: 5, used: 3 },
  { owner: "corp10Full", slug: "demo-sirket-10-tam", name: "Demo Şirket 10 / Tam Dolu", plan: "DEMO-10", limit: 10, used: 10 },
  { owner: "corp2FullA", slug: "demo-sirket-2-tam-a", name: "Demo Şirket 2 / Tam Dolu A", plan: "DEMO-2", limit: 2, used: 2 },
  { owner: "corp2One", slug: "demo-sirket-2-bir-bos", name: "Demo Şirket 2 / 1 Boş", plan: "DEMO-2", limit: 2, used: 1 },
  { owner: "corp2Upgrade", slug: "demo-sirket-2-upgrade", name: "Demo Şirket 2 / Paket Satın Al", plan: "DEMO-2", limit: 2, used: 2, upgrade: true },
  { owner: "lifecycleOwner", slug: "demo-yasam-dongusu", name: "Demo Şirket / Kart Yaşam Döngüsü", plan: "DEMO-10", limit: 10, used: 1 },
];

export function renderDemoTestUsersMarkdown() {
  const lines = [
    "# Yenomi ID — Demo test kullanıcıları",
    "",
    "Bu dosya elle tutulmaz. Kaynak `tests/fixtures/demo-user-matrix.ts` / `.mjs`.",
    "Yenilemek için: `npm run docs:demo-users`.",
    "`scripts/seed-demo-scenarios.mjs` aynı kaydı import eder.",
    "",
    "Şifre git’e yazılmaz. Local apply için `.env.local` içinde `DEMO_SEED_PASSWORD` ve `ALLOW_LOCAL_DEMO_SEED=true`.",
    "Production’da `@yenomi.test` hesabı olamaz (`verify:production:no-demo-users`).",
    "",
    "## Giriş yapılabilen hesaplar",
    "",
    "| Anahtar | E-posta | Tür | Portal | QA niyeti |",
    "|---|---|---|---|---|",
  ];
  for (const user of DEMO_LOGIN_USERS) {
    lines.push(`| \`${user.key}\` | \`${user.email}\` | ${user.kind} | ${user.loginScope} | ${user.intent} |`);
  }
  lines.push(
    "",
    "## Misafir siparişleri (Auth yok)",
    "",
    "Aktivasyon URL’si yalnız `seed:e2e` çıktısında bir kez basılır; token git’e yazılmaz.",
    "",
    "| E-posta | Tür | Sipariş | QA niyeti |",
    "|---|---|---|---|",
  );
  for (const guest of DEMO_GUEST_ORDERS) {
    lines.push(`| \`${guest.email}\` | ${guest.kind} | \`${guest.orderNumber}\` | ${guest.intent} |`);
  }
  lines.push(
    "",
    "## Davet fixture’ları (Auth yok)",
    "",
    "| E-posta | Tür | QA niyeti |",
    "|---|---|---|",
  );
  for (const invite of DEMO_INVITE_FIXTURES) {
    lines.push(`| \`${invite.email}\` | ${invite.kind} | ${invite.intent} |`);
  }
  lines.push(
    "",
    "## Kapasite senaryoları",
    "",
    "| Şirket | Plan | Koltuk |",
    "|---|---|---|",
  );
  for (const scenario of DEMO_CORPORATE_CAPACITY_SCENARIOS) {
    lines.push(`| ${scenario.name} | ${scenario.plan} | ${scenario.used}/${scenario.limit} |`);
  }
  lines.push(
    "",
    "## Kimlik çarpışması",
    "",
    `\`${DEMO_IDENTITY_COLLISION.emailPrefix}*\` adresleri görünen adı \`${DEMO_IDENTITY_COLLISION.displayName}\` olan ayrı üyelerdir. ${DEMO_IDENTITY_COLLISION.intent}`,
    "",
    "## Apply",
    "",
    "```bash",
    "ALLOW_LOCAL_DEMO_SEED=true DEMO_SEED_PASSWORD='…' npm run seed:e2e",
    "```",
    "",
  );
  return `${lines.join("\n")}\n`;
}
