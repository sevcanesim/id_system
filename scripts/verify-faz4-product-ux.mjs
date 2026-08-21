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

const kartim = read("app/kartim/page.tsx");
const notFound = read("app/not-found.tsx");
const nfcOrder = read("app/nfc-siparis/page.tsx");
check(shell.includes("/kartim") && shell.includes("/kartlarim") && shell.includes("/olustur"), "individual workspace is excluded from public marketing chrome");
check(!kartim.includes('label: "Profili Düzenle"') && kartim.includes("Kartviziti Aç") && kartim.includes("Bilgileri Düzenle"), "Kartım keeps one gold open action; edit stays a row");
check(kartim.includes('appearance="secondary"') && kartim.includes("p14-management-row highlight"), "Kartım spare/replacement rows stay secondary management actions");
check(!cards.includes('label:"Profili Düzenle"') && cards.includes("Kimliğime devam et") && cards.includes("NFC Kartı Satın Al"), "dashboard home keeps one gold in the body, purchase only in empty state");
check(notFound.includes('variant="ghost"') && notFound.includes("Ana sayfaya dön") && notFound.includes("NFC Kartı Satın Al"), "404 keeps home as the filled primary and purchase as text");
check(nfcOrder.includes("wizard-actions") && nfcOrder.includes('className="primary"') && css.includes(".wizard-actions .primary"), "legacy NFC order wizard keeps one gold continue action");
check(css.includes(".premium-checkout-card {\n  background: #fff") && css.includes("body:has(.yi-app) .public-site-chrome"), "legacy NFC order card sits on warm paper; account chrome does not resell");

const editor = read("app/olustur/CardWizard.tsx");
const shellCompat = read("app/components/UserPanelShell.tsx");
const dashboard = read("app/ui/DashboardShell.tsx");
const nfcPdp = read("app/urunler/nfc-kart/page.tsx");
check(shellCompat.includes("actions={actions}") && dashboard.includes("onClick={a.onClick}"), "profile editor page-head keeps Kaydet ve Yayınla as a real button");
check(editor.includes("Kaydet ve Yayınla") && editor.includes("p8-mobile-actions") && css.includes("body:has(.p8-mobile-actions)"), "mobile editor keeps sticky save without a second desktop gold");
check(nfcPdp.includes("home-mockup__link-secondary") && nfcPdp.includes("#nfc-hero-price-row") && read("app/urunler/nfc-kart/NfcPurchasePanel.tsx").includes("Sepete Ekle"), "NFC PDP mid/end Sepete Ekle stays a text jump; hero owns the fill");
check(css.includes(".checkout-next") && css.includes("background: #fff") && css.includes(".checkout-pay-button"), "checkout step advance is not a second gold; pay stays the fill");
check(css.includes(".legal-page--premium") && !css.slice(css.lastIndexOf(".legal-page--premium")).includes("79,39,121"), "legal pages drop the leftover purple wash");
check(catalog.includes('appearance="secondary"') && catalog.includes("YEDEK KART"), "catalog spare-card CTA is secondary to the live plans");
check(renewal.includes("ds-button--secondary") && renewal.includes("Leadleri ve mailleri aç"), "renewal mail shortcut is not a competing gold");

if (failed) process.exit(1);
console.log("\nFAZ 4 product/UX verification passed.");
