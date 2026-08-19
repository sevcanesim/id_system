import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "../icons";

export const metadata: Metadata = {
  title: "Yardım Merkezi — Yenomi ID",
  description: "Yenomi ID kart, profil, hesap, sipariş ve kurumsal panel desteği.",
};

type TopicId = "kart" | "profil" | "guvenlik" | "siparis" | "kurumsal" | "teknik";

const topics: Array<{ id: TopicId; title: string; text: string; icon: IconName }> = [
  { id: "kart", title: "Kart & Kurulum", text: "NFC kartınızı etkinleştirin, QR kodunuzu kullanın ve ilk profilinizi yayınlayın.", icon: "nfc" },
  { id: "profil", title: "Profil Yönetimi", text: "Bilgilerinizi güncelleyin, bağlantılarınızı yönetin ve canlı profilinizi paylaşın.", icon: "id" },
  { id: "guvenlik", title: "Güvenlik & Gizlilik", text: "Hesap güvenliği, paylaşım izinleri, oturumlar ve kişisel veriler hakkında bilgi alın.", icon: "shield" },
  { id: "siparis", title: "Sipariş & Faturalandırma", text: "Sipariş, ödeme, teslimat, yenileme ve iade süreçlerini inceleyin.", icon: "box" },
  { id: "kurumsal", title: "Kurumsal Çözümler", text: "Çalışanlar, şablonlar, roller, lisanslar ve merkezi kart yönetimi.", icon: "building" },
  { id: "teknik", title: "Teknik Destek", text: "Bir sorunla karşılaştığınızda doğru çözüm yolunu bulun ve ekibimize ulaşın.", icon: "headset" },
];

const faqs: Array<{ topic: TopicId; question: string; answer: string }> = [
  { topic: "kart", question: "NFC kartım hangi telefonlarda çalışır?", answer: "NFC destekleyen modern iPhone ve Android cihazlarda kartınızı uygulama indirmeden okutabilirsiniz. NFC kapalıysa veya cihaz NFC desteklemiyorsa kart üzerindeki QR kod aynı profile gider." },
  { topic: "kart", question: "Kartımı kaybedersem ne olur?", answer: "Dijital profilinizi panelden yönetmeye devam edebilirsiniz. Fiziksel kartı kayıp moduna alarak güvenli bir bilgilendirme sayfasına yönlendirebilir, bulunmazsa aynı profile bağlı yedek kart sipariş edebilirsiniz." },
  { topic: "profil", question: "Profil bilgilerimi sonradan değiştirebilir miyim?", answer: "Evet. Aktif kullanım süreniz boyunca telefon, unvan, şirket, sosyal medya, web sitesi ve diğer profil bilgilerinizi istediğiniz kadar güncelleyebilirsiniz. Fiziksel kartı yeniden bastırmanız gerekmez." },
  { topic: "profil", question: "QR kodum veya profil bağlantım değişir mi?", answer: "Hayır. Kart üzerindeki QR kod ve profil bağlantısı sabit kalır. Sayfadaki bilgiler değişse bile kartı yeniden bastırmanız gerekmez." },
  { topic: "guvenlik", question: "Ödeme bilgilerim Yenomi ID’de saklanır mı?", answer: "Hayır. Kart numarası gibi hassas ödeme verileri iyzico altyapısı üzerinden işlenir; Yenomi ID sunucularında saklanmaz. Giriş ekranında da ödeme bilgisi alınmaz." },
  { topic: "guvenlik", question: "Kartımı kaybedince başkası profilimi görür mü?", answer: "Kayıp moduna aldığınız kart, iletişim bilgilerini göstermeyen güvenli bir bilgilendirme sayfasına yönlenir. Dijital profilinizi panelden kapatabilir veya yeni kartla aynı profile devam edebilirsiniz." },
  { topic: "siparis", question: "Kart kaç günde hazırlanır ve kargo dahil mi?", answer: "Profil ve sipariş bilgileriniz tamamlandıktan sonra kartınız 2 iş günü içinde hazırlanıp kargoya teslim edilir. Türkiye içi standart kargo ürün fiyatına dahildir. Şimdilik Türkiye dışına sipariş alınmamaktadır." },
  { topic: "siparis", question: "Süre dolunca ne olur?", answer: "Mevcut fiziksel kartınızı yeniden satın almadan dijital hizmetinizi yenileyebilirsiniz. Kartınız ve profil bağlantınız değişmez. Güncel yenileme bedeli ürün sayfasında ve sepette sunucu fiyatıyla doğrulanır." },
  { topic: "kurumsal", question: "Kurumsal hesap ile bireysel hesap arasındaki fark nedir?", answer: "Bireysel hesap kendi dijital kimliğinizi yönetir. Kurumsal hesap ise çalışanları, kartları, şablonları ve yetkileri merkezi olarak yönetir." },
  { topic: "kurumsal", question: "Kurumsal paketi nasıl başlatırım?", answer: "Çalışan sayısı ve kullanım senaryonuzu /kurumsal sayfasındaki teklif formundan gönderin. Talebiniz kayda alınır; ekip 1 iş günü içinde sizinle iletişime geçer. Mevcut kurumsal hesabınız varsa Kurumsal Giriş ile panele dönersiniz." },
  { topic: "teknik", question: "NFC çalışmazsa ne yapmalıyım?", answer: "Kart üzerindeki QR kodu herhangi bir kamera ile okutun; aynı dijital profil açılır. Uygulama indirmeniz gerekmez. Sorun sürerse destek ekibine sipariş veya kart kodunuzla yazın." },
  { topic: "teknik", question: "Hesabıma nasıl girerim?", answer: "Giriş sayfasından bireysel veya kurumsal / ekip bağlamını seçerek e-posta ve şifrenizle oturum açın. Şifrenizi unuttuysanız aynı ekrandan güvenli yenileme bağlantısı isteyebilirsiniz." },
];

function TopicIcon({ value }: { value: IconName }) {
  return <span className="support-topic-icon" aria-hidden="true"><Icon name={value} variant="line" /></span>;
}

function matchesQuery(query: string, topicTitle: string, question: string, answer: string) {
  if (!query) return true;
  const haystack = `${topicTitle} ${question} ${answer}`.toLocaleLowerCase("tr");
  return haystack.includes(query);
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (rawQuery ?? "").trim();
  const normalized = query.toLocaleLowerCase("tr");
  const visibleFaqs = faqs.filter((item) => {
    const topic = topics.find((entry) => entry.id === item.topic);
    return matchesQuery(normalized, topic?.title ?? "", item.question, item.answer);
  });

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
            <input name="q" type="search" defaultValue={query} placeholder="Nasıl yardımcı olabiliriz?" aria-label="Yardım merkezinde ara" />
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
            {topics.map((topic) => (
              <Link className="support-topic-card" key={topic.id} href={`#konu-${topic.id}`}>
                <TopicIcon value={topic.icon} />
                <div><h3>{topic.title}</h3><p>{topic.text}</p></div>
                <span className="support-topic-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="support-faq" id="popular-questions" aria-labelledby="support-faq-title">
          <div className="support-section-head support-section-head--faq">
            <div>
              <span className="section-kicker">POPÜLER SORULAR</span>
              <h2 id="support-faq-title">{query ? `“${query}” için sonuçlar` : "Hızlı cevaplar."}</h2>
            </div>
          </div>
          {visibleFaqs.length === 0 ? (
            <p className="support-empty" role="status">
              “{query}” için kayıtlı bir yardım maddesi yok. Aşağıdan destek ekibine yazabilirsiniz.
            </p>
          ) : (
            <div className="support-faq-list">
              {topics.map((topic) => {
                const items = visibleFaqs.filter((item) => item.topic === topic.id);
                if (!items.length) return null;
                return (
                  <section className="support-faq-group" key={topic.id} id={`konu-${topic.id}`} aria-labelledby={`konu-${topic.id}-title`}>
                    <h3 id={`konu-${topic.id}-title`}>{topic.title}</h3>
                    {items.map((item) => (
                      <details key={item.question} open={Boolean(query)}>
                        <summary>{item.question}<span aria-hidden="true">+</span></summary>
                        <p>{item.answer}</p>
                      </details>
                    ))}
                  </section>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      <section className="support-contact" aria-label="Doğrudan destek">
        <div><span className="section-kicker">DOĞRUDAN DESTEK</span><h2>Aradığınız cevap burada yoksa bize ulaşın.</h2></div>
        <p>Mesajınızı gönderin; ekibimiz hesabınızın bağlamını inceleyerek yardımcı olsun. Hesabınız varsa panele de dönebilirsiniz.</p>
        <div className="support-contact-actions">
          <a className="support-contact-cta" href="mailto:hello@yenomilabs.com">Destek Ekibine Yazın <span aria-hidden="true">→</span></a>
          <Link href="/giris">Hesabıma Git</Link>
        </div>
      </section>

    </main>
  );
}
