import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
let failed = false;
function check(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else { console.error(`FAIL  ${message}`); failed = true; }
}

const landing = read("app/LandingClient.tsx");
const corporate = read("app/kurumsal/page.tsx");
const panel = read("app/kurumsal/panel/CorporatePanelClient.tsx");
const product = read("app/urunler/nfc-kart/page.tsx");

// Validate-first: preserve already mature product/value architecture.
check(landing.includes("Güvenli kayıp modu") && landing.includes("Kartımı kaybedersem ne olur?"), "lost mode remains a visible public value proposition");
check(product.includes("Kayıp modu ve yedek kart desteği") && product.includes("Kartımı kaybedersem ne olur?"), "NFC product page explains lost-card lifecycle");
check(landing.includes('id="nasil-calisir"') && landing.includes('id="destek"') && landing.includes("p4-proof") && landing.includes("p4-final"), "landing retains how-it-works, proof and FAQ conversion structure");

// CTA dictionary: commerce = Satın Al, corporate lead = Teklif Al.
const landingPurchaseMatches = landing.match(/NFC Kartı Satın Al/g) ?? [];
check(landingPurchaseMatches.length >= 3, "public purchase CTAs use canonical 'NFC Kartı Satın Al' copy");
check(!landing.includes("Bireysel NFC Kartı İncele"), "legacy individual purchase CTA copy is retired");
check(corporate.includes("Teklif Al") && corporate.includes('id="teklif"') && !corporate.includes("Kurumsal Görüşme Başlat"), "corporate lead CTA is canonical 'Teklif Al'");

// Corporate overview is already a real dashboard; lock the evidence instead of redesigning it.
for (const label of ["Toplam Çalışan", "Aktif Kart", "Boş Lisans", "Kart görüntülenmeleri", "Lisans Kullanımı"]) {
  check(panel.includes(label), `corporate overview retains '${label}' decision metric`);
}

// User-facing capacity terminology is 'lisans'; internal code may continue to use seat/seat_limit.
for (const legacy of ["Koltuk Kullanımı", "koltuk boş", "koltuk serbest bırakıldı", "kullanılan koltukları"]) {
  check(!panel.includes(legacy), `corporate customer copy no longer uses '${legacy}'`);
}
check(panel.includes("Toplam, kullanılan ve boş lisansları"), "license management description uses one customer-facing terminology");
check(panel.includes("Yeni çalışan için ek lisans gerekli"), "capacity warning uses license terminology");

if (failed) process.exit(1);
console.log("\nFAZ 4 product/UX verification passed.");
