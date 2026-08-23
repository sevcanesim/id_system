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
check(
  how.includes("Tarzını ve Kartını Seç")
    && how.includes("how-steps-board")
    && how.includes("how-card-gallery")
    && how.includes("Profilini Oluştur ve Canlı Tut")
    && how.includes("how-live-sync")
    && !how.includes("Profilini yayınla")
    && !how.includes("how-phone-mockup"),
  "how-it-works keeps the finish gallery and live profile-sync step"
);

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
check(read("app/giris/page.tsx").includes("searchParams") && read("app/giris/LoginClient.tsx").includes('href={portalTabHref("business"') && css.includes(".p6-auth-portal-tabs a") && css.includes(".p6-auth-message.error"), "login corporate tab stays a real link and auth errors stay painted on the card");

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
check(nfcPdp.includes("home-mockup__link-secondary") && nfcPdp.includes("#nfc-hero-price-row") && nfcPdp.includes("Sepete Ekle"), "NFC PDP mid/end Sepete Ekle stays a text jump; hero owns the fill");
check(css.includes(".checkout-next") && css.includes("background: #fff") && css.includes(".checkout-pay-button"), "checkout step advance is not a second gold; pay stays the fill");
check(css.includes(".legal-page--premium") && !css.slice(css.lastIndexOf(".legal-page--premium")).includes("79,39,121"), "legal pages drop the leftover purple wash");
check(catalog.includes('appearance="secondary"') && catalog.includes("YEDEK KART"), "catalog spare-card CTA is secondary to the live plans");
check(renewal.includes("ds-button--secondary") && renewal.includes("Leadleri ve mailleri aç"), "renewal mail shortcut is not a competing gold");
check(!how.includes("how-planet") && !how.includes("how-orbit"), "how-it-works hero does not carry decorative planet chrome");
const productVisual = read("app/ui/YenomiProductVisual.tsx");
check(!productVisual.includes("Adın Soyadın") && productVisual.includes("Selin Kaya") && productVisual.includes("Yenomi Labs"), "product specimen uses a sample identity, not field labels");
check(!how.includes("how-phone-mockup"), "how-it-works does not nest a second phone chrome around the CSS profile");
check(picker.includes("100+ kişi için teklif") && picker.includes("home-mockup__link-secondary") && picker.includes('className="corporate-cta">Teklif Al'), "pack picker keeps live add-to-cart gold and quote as the 100+ primary");
check(
  corporate.includes("corporate-mail-packs")
    && corporate.includes("/kurumsal?plan=ENTERPRISE#teklif")
    && corporate.includes("/kurumsal?plan=NETWORK-MAIL#teklif")
    && !corporate.includes("CAMPAIGN MAIL")
    && !corporate.includes("/kurumsal?plan=CAMPAIGN-MAIL#teklif")
    && !leadForm.includes(">Campaign Mail<")
    && (corporate.match(/home-mockup__link-secondary/g) ?? []).length === 2,
  "enterprise and mail-pack quote paths are text jumps to the lead form"
);
check(corporate.includes("corporate-addon-grid") && corporate.includes("is-num") && corporate.includes("is-action"), "corporate add-on cards share one grid and the price table aligns numeric cells");
check(picker.includes("corporate-pack-picker__badge") && picker.includes("öne çıkan paket"), "pack slider marks the featured pack without overlapping neighbors");
check(css.includes(".corporate-pack-picker__tick {\n  min-width: 44px;\n  min-height: 44px;") && css.includes(".corporate-sales-page .corporate-capability-bar p {\n  color: #3f3a35;\n  font-size: 13px;"), "corporate slider ticks meet 44px and helper copy stays AA on cream");
check(
  css.includes(".corporate-sales-page .corporate-hero-actions .corporate-cta")
    && css.includes("min-height: 48px")
    && css.includes(".corporate-lead-form {\n  padding: 24px;")
    && css.includes("background: #FAF8F3")
    && css.includes("position: sticky;\n    left: 0;")
    && css.includes("overscroll-behavior-x: contain")
    && css.includes("overscroll-behavior-inline: contain"),
  "corporate filled CTAs are 48px, quote form is an inner card, and the price table sticks the first column"
);
check(read("app/design-tokens.css").includes("--warm-muted: #6B655D;"), "global muted token stays AA on the cream canvas");
check(
  corporate.includes("corporate-hero-line")
    && corporate.includes("corporate-hero-line--accent")
    && !corporate.includes("\\u00a0")
    && !corporate.includes("<br"),
  "corporate hero uses semantic visual lines instead of br/nbsp"
);
check(css.includes(".corporate-pack-picker__kicker,\n.corporate-sales-page .corporate-pack-table thead th") && css.includes("font-size: 12px;"), "corporate real UI type stays at or above 12px");
check(css.includes(".p12-save-contact") && css.includes(".p12-networking:has(.p12-networking-form)") && css.includes(".p12-brand-mark"), "public card keeps one gold: save, or submit when the form is open");
check(
  css.includes("body:has(.home-premium) .public-site-chrome .yi-header__actions .yi-btn--primary")
    && css.includes("body:has(.nfc-product-page)")
    && css.includes("body:has(.corporate-sales-page)")
    && css.includes("body:has(.how-it-works-page) .public-site-chrome .yi-nav.is-open .yi-nav__funnel--primary")
    && css.includes("body:has(.products-single-page)")
    && css.includes("body:has(.legal-page) .public-site-chrome .yi-header__actions .yi-btn--primary"),
  "first-viewport sticky header gold is ghosted where the page already owns a fill"
);
const header = read("app/ui/SiteHeader.tsx");
check(
  header.includes("yi-nav-backdrop")
    && header.includes('aria-controls="site-primary-nav"')
    && header.includes('aria-label={open ? "Menüyü kapat" : "Menüyü aç"}')
    && css.includes(".yi-nav-backdrop")
    && css.includes("pointer-events: auto")
    && !css.includes("transform:translateZ(0)")
    && !css.includes("public-site-chrome:has(.yi-nav.is-open)::before"),
  "public hamburger stays clickable above a real backdrop, not a transformed sticky overlay"
);
check(invite.includes('className="home-mockup__link-secondary" href="/kurumsal/panel"') && invite.includes("Kurumsal Girişe Git") && invite.includes("Kurumsal Kartımı Oluştur"), "invite error recovery is text; login and accepted create stay gold");
const publicCard = read("app/p/[publicId]/page.tsx");
const physicalCard = read("app/c/[cardCode]/page.tsx");
check(publicCard.includes("Ana sayfaya dön") && publicCard.includes("home-mockup__link-secondary") && !publicCard.includes("NFC Kartı Satın Al"), "unavailable public-id card recovers home as text, not a purchase gold");
check(physicalCard.includes("Ana sayfaya dön") && physicalCard.includes("home-mockup__link-secondary") && !physicalCard.includes("NFC Kartı Satın Al"), "unavailable physical-card scan recovers home as text, not a purchase gold");
const corporateSalesTail = css.slice(css.lastIndexOf(".corporate-sales-page {"));
check(corporateSalesTail.includes("163,123,44") && !corporateSalesTail.includes("109,61,224"), "corporate sales canvas wash is gold, not leftover purple");
const bireyselBlock = catalog.slice(0, catalog.indexOf("is-popular"));
check(bireyselBlock.includes("Dijital Kartımı Oluştur") && bireyselBlock.includes('appearance="secondary"'), "catalog Digital CTA is the outline acquisition path");
check(catalog.includes("NFC Kartımı Al") && catalog.includes("is-popular") && catalog.includes("Ana ürün"), "catalog marks NFC as the featured offer");
check(catalog.includes("Premium’u Seç") && catalog.includes("Kurumsal Çözümleri İncele") && catalog.includes("Ekibiniz için de Yenomi kullanın"), "catalog Premium stays outline and PLG footer points at corporate");
check(help.includes("support-empty") && help.includes("NFC Kartı Satın Al") && help.includes("home-mockup__link-secondary") && !help.includes('yi-btn--primary'), "help zero-result recovers as text, not a second gold");
const kickerTail = css.slice(css.lastIndexOf(".section-kicker,"));
check(kickerTail.includes("#8b6835") && kickerTail.includes("font-weight: 650"), "section kickers stay readable gold, not display-weight fill");
const analytics = read("app/istatistikler/page.tsx");
check(analytics.includes("İstatistikler yüklenemedi.") && analytics.includes("Hesabına gir") && analytics.includes("/giris?next=%2Fistatistikler"), "analytics load-fail recovers to login instead of a dead end");
check(css.includes(".p9-bars") && css.includes(".p9-settings-grid") && css.includes(".p9-order__progress"), "account orders, settings and analytics keep their layout classes");
const activationTabTail = css.slice(css.lastIndexOf(".activation-tabs button.active"));
check(activationTabTail.includes("background: #fff") && !activationTabTail.slice(0, 180).includes("#A37B2C"), "activation mode tabs are not a second gold; submit stays the fill");
check(css.includes(".yi-app--individual .ds-button--primary") && css.includes(".yi-app .ds-empty"), "individual workspace primaries are solid gold on paper empty states");

check(productVisual.includes("const SPECIMEN") && productVisual.includes("Ürün Yöneticisi") && !productVisual.includes("Ad Soyad"), "product specimen is a named identity, not a field-label mock");
check(!how.includes("how-phone-mockup") && !home.includes("<img") && !catalog.includes("<img"), "public home, catalog and how-it-works mockups stay CSS/SVG, not raster images");
check(css.includes(".products-plan-grid {\n  align-items: stretch;") && css.includes(".how-step-grid {\n  align-items: stretch;"), "catalog and how-it-works card grids stretch to equal height");
check(
  css.includes("grid-template-rows: auto auto auto minmax(0, 1fr)")
    && css.includes(".products-plan-card {\n  display: grid;")
    && css.includes("justify-content: flex-end"),
  "catalog plan cards use a four-row grid so CTA footers share one baseline"
);
check(css.includes("h1, h2, h3, h4 {\n  word-spacing: normal;\n}"), "heading word-spacing stays normal");
const dsButton = read("app/design-system.css");
const dsButtonBlock = dsButton.slice(dsButton.indexOf(".ds-button {"), dsButton.indexOf(".ds-button:hover"));
check(dsButtonBlock.includes("font-weight: 700;"), "design-system buttons stay weight 700");
check(!css.includes("#8064ff"), "leftover neon purple is retired from canonical CSS");
const theme = read("app/theme-policy.css");
check(theme.includes("#F9F8F6") && theme.includes("warm-light") && !theme.includes("#0B0B0B"), "theme policy keeps the warm-light canvas; dark luxury is not the shell");
const playwright = read("playwright.config.ts");
check(playwright.includes('name: "webkit"') && playwright.includes('name: "mobile-webkit"') && playwright.includes("iPhone 13"), "Playwright keeps desktop WebKit and iPhone 13 coverage");
const working = read("docs/product-engineering/16_AGENT_WORKING_CONTRACT.md");
check(working.includes("Selin Kaya") && working.includes("align-items: stretch") && working.includes("#F9F8F6"), "agent working contract encodes the UI guardrails");
const publicNavE2e = read("e2e/public-nav.spec.ts");
check(
  publicNavE2e.includes("Menüyü")
    && publicNavE2e.includes("#site-primary-nav")
    && publicNavE2e.includes("width: 390")
    && publicNavE2e.includes("/urunler")
    && publicNavE2e.includes("/giris")
    && publicNavE2e.includes("/checkout")
    && publicNavE2e.includes("Kartın henüz sepette değil.")
    && publicNavE2e.includes("Kurumsal hesabına giriş yap")
    && publicNavE2e.includes("Escape")
    && !publicNavE2e.includes("test.skip(true"),
  "public hamburger has a 390px Playwright journey that is not a skeleton skip"
);

const sitemapSource = read("app/sitemap.ts");
const robotsSource = read("app/robots.ts");
const layoutSource = read("app/layout.tsx");
check(
  sitemapSource.includes("publicCardOrigin")
    && sitemapSource.includes("/nasil-calisir")
    && sitemapSource.includes("/kurumsal")
    && sitemapSource.includes("/destek")
    && !sitemapSource.includes("https://qr.yenomilabs.com"),
  "sitemap is origin-driven and lists marketing routes"
);
check(
  robotsSource.includes("publicCardOrigin")
    && robotsSource.includes("/nasil-calisir")
    && robotsSource.includes("/kurumsal")
    && robotsSource.includes("/destek")
    && layoutSource.includes("publicCardOrigin")
    && layoutSource.includes("metadataBase: new URL(siteOrigin)"),
  "robots and metadataBase use the public card origin helper"
);
const checkout = read("app/checkout/page.tsx");
check(
  checkout.includes("Sipariş yükleniyor")
    && checkout.includes("Henüz bir ödeme alınmadı")
    && checkout.includes('{busy ? "Ödeme hazırlanıyor…"'),
  "empty checkout first paint is not a fake payment; pay-button busy copy stays"
);
const activationPage = read("app/aktivasyon/page.tsx");
check(
  activationPage.includes("hasToken")
    && activationPage.includes("Aktivasyon bağlantısı yok")
    && activationPage.includes("Sipariş bağlantın kontrol ediliyor."),
  "activation fallback does not claim an order link is being checked without a token"
);
const footer = read("app/ui/SiteFooter.tsx");
check(
  footer.includes('aria-label="Ürün"')
    && footer.includes('href="/urunler"')
    && footer.includes('href="/nasil-calisir"')
    && footer.includes('href="/kurumsal"')
    && !footer.includes("NFC Kartı Satın Al"),
  "footer exposes product routes as text links, not a second gold"
);
check(read("app/components/AnnouncementBar.tsx").includes('aria-hidden="true"'), "ticker duplicate track is hidden from assistive tech");

if (failed) process.exit(1);
console.log("\nFAZ 4 product/UX verification passed.");
