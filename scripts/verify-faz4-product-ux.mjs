import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
let failed = false;
function check(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else { console.error(`FAIL  ${message}`); failed = true; }
}

const home = read("app/page.tsx");
const how = read("app/nasil-calisir/page.tsx");
const corporate = read("app/kurumsal/page.tsx");
const panel = read("app/kurumsal/panel/CorporatePanelClient.tsx") + read("app/kurumsal/panel/components/OverviewPanel.tsx");
const product = read("app/urunler/nfc-kart/page.tsx");

check(home.includes("KAYIP MODU") && home.includes("Kaybolursa kapanır") && product.includes("Kartımı kaybedersem ne olur?"), "lost mode remains a visible public value proposition");
check(product.includes("Kayıp modu ve yedek kart desteği") && product.includes("Kartımı kaybedersem ne olur?"), "NFC product page explains lost-card lifecycle");
check(home.includes('href="/nasil-calisir"') && home.includes("home-premium__proof") && home.includes("home-premium__final") && how.includes("how-it-works-page"), "landing retains how-it-works, proof and final conversion structure");
check(how.includes("Kaybolursa kapat") && !how.includes("12.8K") && !how.includes("4.2K"), "how-it-works keeps lost-mode without fake analytics totals");

const landingPurchaseMatches = home.match(/NFC Kartı Satın Al/g) ?? [];
check(landingPurchaseMatches.length >= 3, "public purchase CTAs use canonical 'NFC Kartı Satın Al' copy");
check(!home.includes("Bireysel NFC Kartı İncele"), "legacy individual purchase CTA copy is retired");
check(corporate.includes("Teklif Al") && corporate.includes('id="teklif"') && !corporate.includes("Kurumsal Görüşme Başlat"), "corporate lead CTA is canonical 'Teklif Al'");
check(!corporate.includes("482") && !corporate.includes("219") && !corporate.includes(">87<"), "corporate marketing specimen does not invent analytics totals");
check(corporate.includes("Sepete Ekle") && corporate.includes("corporateCheckoutLive") && corporate.includes("ENTERPRISE"), "packs at or below 100 seats use add-to-cart; Enterprise stays quote");

// Corporate overview is already a real dashboard; lock the evidence instead of redesigning it.
for (const label of ["Aktif Çalışan", "Aktif Kart", "boş lisansları", "Kart görüntülenmeleri", "Lisans Kullanımı"]) {
  check(panel.includes(label), `corporate overview retains '${label}' decision metric`);
}

// User-facing capacity terminology is 'lisans'; internal code may continue to use seat/seat_limit.
for (const legacy of ["Koltuk Kullanımı", "koltuk boş", "koltuk serbest bırakıldı", "kullanılan koltukları"]) {
  check(!panel.includes(legacy), `corporate customer copy no longer uses '${legacy}'`);
}
check(panel.includes("Toplam, kullanılan ve boş lisansları"), "license management description uses one customer-facing terminology");
check(panel.includes("Yeni çalışan için ek lisans gerekli"), "capacity warning uses license terminology");

const catalog = read("app/urunler/page.tsx");
const addToCart = read("app/components/AddToCartButton.tsx");
check(catalog.includes("YEDEK KART") && catalog.includes("Aktif hizmet gerekir"), "catalog still offers the spare-card product as an add-on");
check(!catalog.includes("İlk kartım yok"), "catalog no longer uses the spare-card dead-end CTA");
check(addToCart.includes("physicalAddonCartGate") && addToCart.includes("Giriş gerekli") === false, "spare-card cart control is gated in domain copy, not inline slogans");
check(addToCart.includes("isPhysicalAddonSku") && addToCart.includes("disabled={blocked}"), "spare and replacement cards render a disabled purchase control when gated");
check(read("lib/commerce/physical-addon-access.ts").includes("Giriş gerekli"), "spare-card guest copy states that login is required");

const paymentFailed = read("app/odeme/basarisiz/page.tsx");
const paymentRetry = read("app/odeme/basarisiz/PaymentRetryActions.tsx");
const paymentSuccess = read("app/odeme/basarili/page.tsx");
const activation = read("app/aktivasyon/ActivationClient.tsx");
check(paymentFailed.includes("showDefaultCta={false}") && !paymentFailed.includes("Ödemeyi yeniden dene"), "failed-payment header stays quiet; retry lives in the result body");
check(paymentRetry.includes("Aynı Sipariş İçin Tekrar Dene") && paymentRetry.includes('className="secondary"'), "failed-payment retry is the single filled primary");
check(paymentSuccess.includes("Siparişlerim") && read("app/odeme/basarili/PaymentSuccessHeader.tsx").includes("showDefaultCta={false}"), "paid-result chrome stays on orders and does not re-sell the card");
check(activation.includes("showDefaultCta={false}") && activation.includes('landing'), "activation header does not show a purchase CTA");

const shell = read("app/components/PublicSiteShell.tsx");
const invite = read("app/kurumsal/davet/page.tsx");
const orders = read("app/siparislerim/page.tsx");
const renewal = read("app/yenile/page.tsx");
const cards = read("app/kartlarim/page.tsx");
check(shell.includes('#business-pricing-title') && shell.includes("Paketleri İncele"), "corporate header points at packs; quote stays on the page");
check(corporate.includes('id="teklif"') && (corporate.match(/Teklif Al/g) ?? []).length >= 3, "corporate quote path remains canonical Teklif Al");
check(invite.includes("showDefaultCta={false}") && invite.includes("landing"), "corporate invite header does not resell the card");
check(orders.includes("NFC Kartı Satın Al") && !orders.includes("actions={[{href:\"/urunler/nfc-kart\""), "orders empty state keeps the purchase CTA without a duplicate page-head action");
check(renewal.includes("Hesabına gir") && renewal.includes("NFC Kartı Satın Al"), "renewal empty states have a single next action");
check(cards.includes("NFC Kartı Satın Al") && cards.includes("/urunler/nfc-kart"), "empty individual workspace uses the canonical purchase CTA");

const help = read("app/destek/page.tsx");
const picker = read("app/kurumsal/CorporatePackPicker.tsx");
const leadForm = read("app/kurumsal/CorporateLeadForm.tsx");
const css = read("app/canonical.css");
check(!shell.includes("Destek Yazın") && shell.includes("/destek"), "help chrome stays quiet; search owns the in-page action");
check(!help.includes("support-planet") && !help.includes("support-orbit"), "help hero does not carry decorative planet chrome");
check(picker.includes("home-mockup__link-secondary") && picker.includes("100+ kişi için teklif"), "corporate pack picker keeps quote as a text link");
check(leadForm.includes(">Teklif Al<") || leadForm.includes('"Teklif Al"'), "corporate lead submit uses canonical Teklif Al");
check(css.includes("scroll-margin-top: 124px") && css.includes("business-pricing-title"), "corporate pricing heading clears sticky chrome");
check(read("app/ui/SiteHeader.tsx").includes("onAuthSurface"), "login header does not repeat Giriş Yap on /giris");

if (failed) process.exit(1);
console.log("\nFAZ 4 product/UX verification passed.");
