"use client";

/**
 * Frozen Phase 4 public-conversion artifact.
 * The live homepage is `app/page.tsx`. This file is not mounted; historical
 * verifiers still read it as a contract snapshot. Do not delete without
 * repointing those verifiers to the live homepage.
 */

import Link from "next/link";
import AppHeader from "./components/AppHeader";
import AppFooter from "./components/AppFooter";
import AnnouncementBar from "./components/AnnouncementBar";
import { YenomiProductVisual } from "./ui/YenomiProductVisual";
import { Icon } from "./icons";
import { track } from "../lib/analytics";
import { formatTryFromKurus, NFC_PRODUCT } from "../lib/config/product";
import { COMMERCIAL_COPY } from "../lib/config/commercial";
import FAQList from "./components/FAQList";

const benefits = [
  ["01", "nfc", "Tek dokunuş ile paylaş", "NFC ve QR entegrasyonuyla iletişim bilgilerin saniyeler içinde açılsın."],
  ["02", "refresh", "Anında güncellenebilir profil", "Unvanın veya numaran değiştiğinde kartını yeniden bastırmadan profilini yenile."],
  ["03", "shield", "Güvenli kayıp modu", "Kartın kaybolduğunda panelinden tek hareketle pasife al; dijital kimliğinin kontrolü sende kalsın."],
  ["04", "building", "Kurumsal marka standardı", "Tüm ekibin dijital kartvizitlerini tek merkezden ve aynı marka diliyle yönet."],
] as const;

const packageItems = [
  "1x Premium Yenomi ID NFC kart",
  "Kişisel QR kimliği",
  "Dijital kartvizit profilin",
  "Profil yönetim paneli",
  "1 yıllık dijital hizmet",
  "Türkiye içi ücretsiz kargo",
];

const questions: readonly (readonly [string, string])[] = [
  ["NFC destekleyen telefonlarda çalışır mı?", "NFC destekli çoğu modern telefonda kartı yaklaştırmak yeterlidir. NFC kullanılamadığında aynı profil kart üzerindeki QR kodla açılır."],
  ["Uygulama indirmek gerekiyor mu?", "Hayır. Profil doğrudan tarayıcıda açılır; karşı tarafın üye olması veya uygulama indirmesi gerekmez."],
  ["Bilgilerimi sonradan değiştirebilir miyim?", "Evet. Aktif kullanım süren boyunca telefon, ünvan, şirket, sosyal medya ve web sitesi bilgilerini istediğin kadar güncelleyebilirsin."],
  ["NFC çalışmazsa ne olur?", "Cihazın NFC desteklemiyorsa veya NFC kapalıysa kart üzerindeki QR kod aynı profili açar."],
  ["Kartımı kaybedersem ne olur?", "Kartını hesabından kayıp moduna alarak fiziksel kart üzerinden profil erişimini durdurabilirsin. Dijital profilin hesabında kalır."],
  ["1 yıllık hizmet sonunda ne olur?", `Fiziksel kartını yeniden satın almadan dijital hizmetini ${COMMERCIAL_COPY.renewalPrice}/yıl karşılığında yenileyebilirsin. Kartın ve profil bağlantın değişmez.`],
  ["Kart ne zaman kargoya verilir?", "Sipariş ve profil bilgilerin tamamlandıktan sonra kartın 2 iş günü içinde hazırlanıp kargoya teslim edilir."],
  ["Kurumsal olarak toplu sipariş verebilir miyim?", "Evet. Kurumsal panelden çalışan kartlarını merkezi olarak yönetebilir, toplu sipariş verip lisans atayabilirsin."],
];

const qrCells = Array.from({ length: 16 }, (_, index) => index);

export default function LandingClient() {
  const productPrice = formatTryFromKurus(NFC_PRODUCT.unitPriceKurus);

  return (
    <main id="main-content" className="p4-public-home">
      <AnnouncementBar />
      <AppHeader landing />

      <section className="p4-hero" aria-labelledby="home-hero-title">
        <div className="p4-shell p4-hero-grid">
          <div className="p4-hero-copy">
            <p className="p4-kicker p4-premium-badge">Premium dijital kimlik · Bireysel + Kurumsal</p>
            <h1 className="p4-display" id="home-hero-title">Dijital kimliğin.<br/>Tek bir bağlantıda.</h1>
            <p className="p4-lead">Profesyonel dijital kimliğini tek bağlantıda oluştur. Bilgilerini dilediğin an güncelle; NFC veya QR ile gerçek dünyada paylaş.</p>
            <div className="p4-actions">
              <Link href="/urunler/nfc-kart" className="p4-button p4-button-primary" onClick={() => track("nfc_product_view", { location: "phase4_home_hero" })}>NFC Kartı Satın Al <span aria-hidden>→</span></Link>
              <Link href="#nasil-calisir" className="p4-button secondary" onClick={() => track("hero_cta_click", { location: "phase4_home_hero_how" })}>Nasıl Çalışır?</Link>
            </div>
            <div className="p4-hero-note" aria-label="Yenomi ID temel avantajları">
              <span><Icon name="lock" /> 1 yıl dijital hizmet dahil</span><span><Icon name="nfc" /> NFC destekleyen iOS &amp; Android cihazlarla uyumlu</span><span><Icon name="qr" /> NFC çalışmazsa QR ile paylaş</span>
            </div>
          </div>

          <div className="p4-product-demo" aria-label="NFC karttan dijital profile geçiş örneği">
            <span className="p4-flow-chip"><i /> Kart → NFC → Profil</span>
            <div className="p4-phone" aria-hidden="true">
              <div className="p4-phone-screen">
                <div className="p4-phone-cover" />
                <div className="p4-phone-avatar">YI</div>
                <span className="p4-phone-live">CANLI PROFİL</span>
                <h2>Sevcan Eşim Karadeniz</h2>
                <p>Yenomi Labs · Kurucu</p>
                <div className="p4-phone-actions"><span><Icon name="phone" /></span><span><Icon name="mail" /></span><span><Icon name="social" /></span><span><Icon name="plus" /></span></div>
                <div className="p4-phone-save">Rehbere Kaydet</div>
              </div>
            </div>
            <div className="p4-physical-card" aria-hidden="true">
              <div className="p4-card-brand">YENOMI ID</div>
              <div className="p4-card-nfc">)))</div>
              <div className="p4-card-bottom"><small>Yaklaştır.<br/>Profilini paylaş.</small><span className="p4-card-qr">{qrCells.map((cell) => <i key={cell} />)}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="p4-section p4-benefits-section" aria-labelledby="why-title">
        <div className="p4-shell">
          <div className="p4-section-head"><div><p className="p4-kicker">Neden Yenomi ID?</p><h2 id="why-title">Dijital kimliğin eskimesin.</h2></div><p className="p4-copy">Telefonun, şirketin veya unvanın değişse bile dijital kimliğin aynı bağlantıda kalır. Daima güncel ve prestijli.</p></div>
          <div className="p4-benefit-grid">
            {benefits.map(([num, icon, title, description]) => (
              <div className="p4-benefit" key={num}>
                <span className="p4-benefit-icon" aria-hidden="true"><Icon name={icon} /></span>
                <small>{num}</small>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="p4-proof" aria-labelledby="product-proof-title">
        <div className="p4-shell p4-proof-card">
          <div className="p4-proof-visual"><YenomiProductVisual variant="card" /></div>
          <div className="p4-proof-copy">
            <p className="p4-kicker">Tek kart. Tek sistem.</p>
            <h2 id="product-proof-title">Fiziksel kart. Dijital profil. Tek sistem.</h2>
            <p className="p4-copy">Fiziksel NFC + QR kart, güncellenebilir dijital profil ve hesabından yönetebildiğin kimlik altyapısı birlikte çalışır.</p>
            <div className="p4-proof-steps" aria-label="Yenomi ID nasıl paylaşılır">
              <div><span className="p4-proof-step-icon"><Icon name="nfc" /></span><div><strong>NFC ile paylaş</strong><small>Telefonuna kartı yaklaştır, profilin anında açılsın.</small></div></div>
              <div><span className="p4-proof-step-icon"><Icon name="qr" /></span><div><strong>QR ile paylaş</strong><small>NFC olmayan durumda QR kodu okut.</small></div></div>
              <div><span className="p4-proof-step-icon"><Icon name="pencil" /></span><div><strong>Profilini güncelle</strong><small>Bilgilerin değiştiğinde kartı yeniden bastırma.</small></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="p4-section" id="nasil-calisir" aria-labelledby="how-title">
        <div className="p4-shell">
          <div className="p4-section-head"><div><p className="p4-kicker">Nasıl çalışır?</p><h2 id="how-title">3 adımda paylaşmaya başla.</h2></div><p className="p4-copy">Fiziksel ürün ve dijital hesabın tek akışta ilerler. Her adımda ne yapacağın nettir.</p></div>
          <div className="p4-how-grid">
            <article className="p4-step"><span className="p4-step-badge">01</span><h3>Satın al</h3><p>Kartını seç, siparişini tamamla.</p></article>
            <span className="p4-step-arrow" aria-hidden><Icon name="chevronRight" /></span>
            <article className="p4-step"><span className="p4-step-badge">02</span><h3>Etkinleştir</h3><p>Hesabını oluştur, profil bilgilerini ekle.</p></article>
            <span className="p4-step-arrow" aria-hidden><Icon name="chevronRight" /></span>
            <article className="p4-step"><span className="p4-step-badge">03</span><h3>Paylaş</h3><p>NFC&#39;yi yaklaştır veya QR kodunu okut.</p></article>
          </div>
        </div>
      </section>

      <section className="p4-section p4-pack" aria-labelledby="pack-title">
        <div className="p4-shell p4-pack-grid">
          <div className="p4-pack-visual" aria-hidden="true">
            <div className="p4-pack-lid"><span>YENOMI ID</span></div>
            <div className="p4-pack-body">
              <div className="p4-pack-card"><b>YENOMI ID</b><i>)))</i></div>
              <div className="p4-pack-insert" />
            </div>
          </div>
          <div className="p4-pack-copy">
            <p className="p4-kicker">Kutudan ne çıkıyor?</p>
            <h2 id="pack-title">Bir karttan fazlası.<br/>Tüm ihtiyaçların tek pakette.</h2>
            <ul className="p4-pack-list">
              {packageItems.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}
            </ul>
            <aside className="p4-pack-price">
              <small>Yenomi ID NFC Kart</small>
              <strong>{productPrice}</strong>
              <span>1 yıl dijital hizmet dahil · Ücretsiz kargo</span>
              <Link href="/urunler/nfc-kart" className="p4-button p4-button-primary">NFC Kartı Satın Al <span aria-hidden>→</span></Link>
              <small className="p4-pack-eta"><Icon name="truck" /> 2 iş günü içinde hazırlanır</small>
            </aside>
          </div>
        </div>
      </section>

      <section className="p4-section" aria-labelledby="path-title">
        <div className="p4-shell">
          <div className="p4-section-head"><div><p className="p4-kicker">Size en uygun çözüm</p><h2 id="path-title">Kendin için mi, ekibin için mi?</h2></div></div>
          <div className="p4-path-grid">
            <div className="p4-path individual">
              <span className="p4-path-icon"><Icon name="contact" /></span>
              <span className="p4-path-label">Bireysel</span>
              <h3>Tek kart, tek profil.</h3>
              <ul className="p4-path-list">
                <li><Icon name="check" /><span>Tek kart, tek profil</span></li>
                <li><Icon name="check" /><span>Kişisel bilgilerini yönet</span></li>
                <li><Icon name="check" /><span>Her tanışmada profesyonel görün</span></li>
              </ul>
              <Link href="/urunler/nfc-kart" className="p4-button secondary">NFC Kartı Satın Al <span aria-hidden>→</span></Link>
            </div>
            <div className="p4-path corporate">
              <span className="p4-path-icon"><Icon name="building" /></span>
              <span className="p4-path-label">Kurumsal</span>
              <h3>Ekibinle birlikte ölçeklen.</h3>
              <ul className="p4-path-list">
                <li><Icon name="check" /><span>Çalışan kartları</span></li>
                <li><Icon name="check" /><span>Merkezi yönetim</span></li>
                <li><Icon name="check" /><span>Kurumsal profil standardı</span></li>
                <li><Icon name="check" /><span>Toplu sipariş avantajı</span></li>
              </ul>
              <Link href="/kurumsal" className="p4-button p4-button-primary">Kurumsal Çözümü İncele <span aria-hidden>→</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="p4-section" id="destek" aria-labelledby="faq-title">
        <div className="p4-shell p4-faq-layout"><div><p className="p4-kicker">Sık sorulan sorular</p><h2 id="faq-title">Merak ettiklerim burada.</h2></div><FAQList items={questions} className="p4-faq-list p4-faq-grid" /></div>
      </section>

      <section className="p4-final" aria-labelledby="final-cta-title">
        <div className="p4-shell">
          <p className="p4-kicker p4-kicker-center">Yenomi ID</p>
          <h2 id="final-cta-title">Bir sonraki tanışmada sistemin hazır olsun.</h2>
          <p>NFC + QR kartını seç. Ödeme sonrasında hesabını etkinleştir ve dijital kartvizitini kullanmaya başla.</p>
          <div className="p4-actions"><Link href="/urunler/nfc-kart" className="p4-button p4-button-primary">NFC Kartı Satın Al <span aria-hidden>→</span></Link><Link href="/kurumsal" className="p4-button secondary">Kurumsal Çözüm</Link></div>
          <p className="p4-final-note">İlk paket {COMMERCIAL_COPY.initialPrice} ve 1 yıllık dijital hizmet içerir. Sonraki yıllarda fiziksel kartını kullanmaya devam eder, dijital hizmeti {COMMERCIAL_COPY.renewalPrice}/yıl karşılığında yenilersin.</p>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
