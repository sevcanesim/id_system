import fs from "node:fs";
import path from "node:path";

const seed = fs.readFileSync(path.join(process.cwd(), "scripts/seed-demo-scenarios.mjs"), "utf8");
let failed = 0;
const pass = (label) => console.log(`PASS  ${label}`);
const fail = (label) => {
  failed += 1;
  console.error(`FAIL  ${label}`);
};

const loginAccounts = [
  "demo.superadmin@yenomi.test",
  "demo.card.pending@yenomi.test",
  "demo.card.complete@yenomi.test",
  "demo.corp5.full@yenomi.test",
  "demo.corp5.three@yenomi.test",
  "demo.corp10.full@yenomi.test",
  "demo.corp2.full-a@yenomi.test",
  "demo.corp2.one@yenomi.test",
  "demo.corp2.full-upgrade@yenomi.test",
  "demo.bireysel.bos@yenomi.test",
  "demo.bireysel.aktif@yenomi.test",
  "demo.kurumsal.yonetici@yenomi.test",
  "demo.ik.yonetici@yenomi.test",
  "demo.departman.yonetici@yenomi.test",
  "demo.calisan.kayit@yenomi.test",
  "demo.calisan.kartyok@yenomi.test",
  "demo.calisan.dijital@yenomi.test",
  "demo.calisan.atanmis@yenomi.test",
  "demo.calisan.kayip@yenomi.test",
  "demo.calisan.yedek@yenomi.test",
  "demo.calisan.pasif@yenomi.test",
  "demo.calisan.ayrildi@yenomi.test",
  "demo.kurumsal.dolu@yenomi.test",
  "demo.kurumsal.bos@yenomi.test",
  "demo.kurumsal.eksik@yenomi.test",
  "demo.kurumsal.template@yenomi.test",
  "demo.kurumsal.lead@yenomi.test",
  "demo.bireysel.premium@yenomi.test",
  "demo.bireysel.suresi.dolmus@yenomi.test",
  "demo.bireysel.kayip@yenomi.test",
  "demo.bireysel.yedek@yenomi.test",
  "demo.bireysel.claim.mismatch@yenomi.test",
  "demo.bireysel.yabanci@yenomi.test",
];

for (const email of loginAccounts) {
  if (seed.includes(`email: "${email}"`)) pass(`login fixture ${email}`);
  else fail(`login fixture missing from seed: ${email}`);
}

const requiredNeedles = [
  ["pending invite without auth user", 'email: "demo.calisan.davet@yenomi.test"'],
  ["pending invite stays INVITED", 'status: "INVITED"'],
  ["same-name identity pair", "demo.ayni.isim."],
  ["same-name display collision", 'full_name:"Ahmet Yılmaz"'],
  ["lifecycle unassigned stock", "YN-LIFEUNASSGN1"],
  ["QA org unassigned stock", "YN-QASTOCK0001A"],
  ["backup card pair", "YN-TRBACKALT001"],
  ["lost card", "YN-TRLOST000001"],
  ["full 5-seat occupancy", "limit: 5, used: 5"],
  ["empty company is owner-only", 'slug:"demo-tr-yeni-kurumsal"'],
  ["partial occupancy 6/10", "limit:10, used:6"],
  ["HR cannot be invented as license admin", 'email: "demo.ik.yonetici@yenomi.test"'],
  ["department manager is Satış-scoped", '"trDepartmentManager","DEPARTMENT_MANAGER","ACTIVE","Departman Yöneticisi","Satış"'],
  ["duplicate-email is a procedure against an existing member", "demo.calisan.dijital@yenomi.test again"],
  ["lead remains an explicit product gap", "no lead domain table exists yet"],
  ["password stays out of source", "Şifre DEMO_SEED_PASSWORD"],
  ["premium individual fixture", "YENOMI-NFC-PREMIUM-ANNUAL"],
  ["expired entitlement fixture", 'entitlementStatus: "EXPIRED"'],
  ["individual lost card", "YN-INDLOST00001"],
  ["individual backup card pair", "YN-INDYEDKALT01"],
  ["spare card SKU upsert", "YENOMI-NFC-EXTRA"],
  ["guest activation order", 'email: "demo.bireysel.aktivasyon.bekler@yenomi.test"'],
  ["guest claim-mismatch order", 'email: "demo.bireysel.claim.siparis@yenomi.test"'],
  ["guest corporate paid order", 'email: "demo.kurumsal.misafir.paid@yenomi.test"'],
  ["guest orders stay unclaimed", "user_id: null"],
  ["activation token derived at apply", "demo:${password}:"],
];

for (const [label, needle] of requiredNeedles) {
  if (seed.includes(needle)) pass(label);
  else fail(label);
}

if (/\bYenomiDemo\d+!/.test(seed)) {
  fail("seed must not embed the demo password");
} else {
  pass("seed does not embed the demo password");
}

if (failed) {
  console.error(`\nDemo QA matrix verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nDemo QA matrix is locked to the seed registry.");
