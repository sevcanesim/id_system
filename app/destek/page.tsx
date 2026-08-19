import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "../icons";

export const metadata: Metadata = {
  title: "Yardım Merkezi — Yenomi ID",
  description: "Yenomi ID kart, profil, hesap, sipariş ve kurumsal panel desteği.",
};

const topics: Array<[string, string, IconName]> = [
  ["Kart & Kurulum", "NFC kartınızı etkinleştirin, QR kodunuzu kullanın ve ilk profilinizi yayınlayın.", "nfc"],
  ["Profil Yönetimi", "Bilgilerinizi güncelleyin, bağlantılarınızı yönetin ve canlı profilinizi paylaşın.", "id"],
  ["Güvenlik & Gizlilik", "Hesap güvenliği, paylaşım izinleri, oturumlar ve kişisel veriler hakkında bilgi alın.", "shield"],
  ["Sipariş & Faturalandırma", "Sipariş, ödeme, teslimat, yenileme ve iade süreçlerini inceleyin.", "box"],
  ["Kurumsal Çözümler", "Çalışanlar, şablonlar, roller, lisanslar ve merkezi kart yönetimi.", "building"],
  ["Teknik Destek", "Bir sorunla karşılaştığınızda doğru çözüm yolunu bulun ve ekibimize ulaşın.", "headset"],
];

const faqs = [
  ["NFC kartım hangi telefonlarda çalışır?", "NFC destekleyen modern iPhone ve Android cihazlarda kartınızı uygulama indirmeden okutabilirsiniz. QR kod da her zaman alternatif erişim noktasıdır."],
  ["Kartımı kaybedersem ne olur?", "Dijital profilinizi panelden yönetmeye devam edebilirsiniz. Fiziksel kartı pasife alarak yeni kart sürecini başlatabilirsiniz."],
  ["Profil bilgilerimi sonradan değiştirebilir miyim?", "Evet. Profiliniz canlı bağlantı üzerinden güncellenir; fiziksel kartı yeniden bastırmanız gerekmez."],
  ["Kurumsal hesap ile bireysel hesap arasındaki fark nedir?", "Bireysel hesap kendi dijital kimliğinizi yönetir. Kurumsal hesap ise çalışanları, kartları, şablonları ve yetkileri merkezi olarak yönetir."],
];

function TopicIcon({ value }: { value: IconName }) {
  return <span className="support-topic-icon" aria-hidden="true"><Icon name={value} variant="line" /></span>;
}

export default function SupportPage() {
  return (
    <main id="main-content" className="support-page">

      <section className="support-hero" aria-labelledby="support-title">
        <div className="support-orbit support-orbit--one" aria-hidden="true" />
        <div className="support-orbit support-orbit--two" aria-hidden="true" />
        <div className="support-planet" aria-hidden="true"><span /></div>
        <div className="support-hero-inner">
          <span className="section-kicker">YARDIM MERKEZİ</span>
          <h1 id="support-title">Yardım <em>Merkeziniz.</em></h1>
          <p>Doğru bilgiye hızlıca ulaşın. Kartınızdan hesabınıza, siparişinizden kurumsal yönetiminize kadar her şey tek yerde.</p>
          <form className="support-search" role="search" action="/destek" method="get">
            <span className="support-search__icon" aria-hidden="true"><Icon name="search" /></span>
            <input name="q" type="search" placeholder="Nasıl yardımcı olabiliriz?" aria-label="Yardım merkezinde ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
      </section>

      <section className="support-main" aria-labelledby="support-topics-title">
        <div className="support-topics">
          <div className="support-section-head">
            <div><span className="section-kicker">KONULAR</span><h2 id="support-topics-title">İhtiyacınız olan başlangıç noktası.</h2></div>
            <p>En sık kullanılan yardım alanlarını seçin ve doğrudan ilgili bilgiye geçin.</p>
          </div>
          <div className="support-topic-grid">
            {topics.map(([title, text, icon]) => (
              <Link className="support-topic-card" key={title} href="#popular-questions">
                <TopicIcon value={icon} />
                <div><h3>{title}</h3><p>{text}</p></div>
                <span className="support-topic-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="support-faq" id="popular-questions" aria-labelledby="support-faq-title">
          <div className="support-section-head support-section-head--faq">
            <div><span className="section-kicker">POPÜLER SORULAR</span><h2 id="support-faq-title">Hızlı cevaplar.</h2></div>
          </div>
          <div className="support-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </aside>
      </section>

      <section className="support-contact" aria-label="Doğrudan destek">
        <div><span className="section-kicker">DOĞRUDAN DESTEK</span><h2>Aradığınız cevap burada yoksa bize ulaşın.</h2></div>
        <p>Mesajınızı gönderin; ekibimiz hesabınızın bağlamını inceleyerek yardımcı olsun.</p>
        <a className="support-contact-cta" href="mailto:hello@yenomilabs.com">Destek Ekibine Yazın <span aria-hidden="true">→</span></a>
      </section>

    </main>
  );
}
