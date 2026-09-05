import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { COMMERCIAL_FULFILLMENT } from "../../lib/config/commercial";
import { getLegalIdentity } from "../../lib/config/legal-identity";

export const metadata: Metadata = {
  title: "Yardım Merkezi — Yenomi ID",
  description: "Kart, kargo, PayTR ödemesi, hesap ve kurumsal panel için net yanıtlar.",
};

type TopicId = "kart" | "profil" | "guvenlik" | "siparis" | "kurumsal" | "teknik";

const topics: Array<{ id: TopicId; title: string; text: string; icon: IconName }> = [
  { id: "kart", title: "Kart & Kurulum", text: "NFC, QR ve ilk kullanım", icon: "nfc" },
  { id: "profil", title: "Profil Yönetimi", text: "Bilgi ve bağlantı güncelleme", icon: "id" },
  { id: "guvenlik", title: "Güvenlik & Gizlilik", text: "Kayıp modu ve ödeme güvenliği", icon: "shield" },
  { id: "siparis", title: "Sipariş & Fatura", text: "Ödeme, kargo ve yenileme", icon: "box" },
  { id: "kurumsal", title: "Kurumsal", text: "Çalışan, lisans ve ekip yönetimi", icon: "building" },
  { id: "teknik", title: "Teknik Destek", text: "NFC, hesap ve erişim sorunları", icon: "headset" },
];

const faqs: Array<{ topic: TopicId; question: string; answer: string }> = [
  { topic: "kart", question: "NFC kartım hangi telefonlarda çalışır?", answer: "NFC destekleyen modern iPhone ve Android cihazlarda kartınızı uygulama indirmeden okutabilirsiniz. NFC kapalıysa veya cihaz NFC desteklemiyorsa kart üzerindeki QR kod aynı profile gider." },
  { topic: "kart", question: "Kartımı kaybedersem ne olur?", answer: "Dijital profilinizi panelden yönetmeye devam edebilirsiniz. Fiziksel kartı kayıp moduna alarak güvenli bir bilgilendirme sayfasına yönlendirebilir, bulunmazsa aynı profile bağlı yedek kart sipariş edebilirsiniz." },
  { topic: "profil", question: "Profil bilgilerimi sonradan değiştirebilir miyim?", answer: "Evet. Aktif kullanım süreniz boyunca telefon, unvan, şirket, sosyal medya, web sitesi ve diğer profil bilgilerinizi istediğiniz kadar güncelleyebilirsiniz. Fiziksel kartı yeniden bastırmanız gerekmez." },
  { topic: "profil", question: "QR kodum veya profil bağlantım değişir mi?", answer: "Hayır. Kart üzerindeki QR kod ve profil bağlantısı sabit kalır. Sayfadaki bilgiler değişse bile kartı yeniden bastırmanız gerekmez." },
  { topic: "guvenlik", question: "Ödeme bilgilerim Yenomi ID’de saklanır mı?", answer: "Hayır. Kart numarası gibi hassas ödeme verileri PayTR altyapısı üzerinden işlenir; Yenomi ID sunucularında saklanmaz. Giriş ekranında da ödeme bilgisi alınmaz." },
  { topic: "guvenlik", question: "Kartımı kaybedince başkası profilimi görür mü?", answer: "Kayıp moduna aldığınız kart, iletişim bilgilerini göstermeyen güvenli bir bilgilendirme sayfasına yönlenir. Dijital profilinizi panelden kapatabilir veya yeni kartla aynı profile devam edebilirsiniz." },
  { topic: "siparis", question: "Kartım ne zaman kargoya verilir; kargo dahil mi?", answer: `Profil ve sipariş bilgileriniz tamamlandıktan sonra kartınız ${COMMERCIAL_FULFILLMENT.handover.toLocaleLowerCase()}. ${COMMERCIAL_FULFILLMENT.domesticShipping} ürün fiyatına dahildir. Şimdilik Türkiye dışına sipariş alınmamaktadır.` },
  { topic: "siparis", question: "Süre dolunca ne olur?", answer: "Mevcut fiziksel kartınızı yeniden satın almadan dijital hizmetinizi yenileyebilirsiniz. Kartınız ve profil bağlantınız değişmez. Güncel yenileme bedeli ürün sayfasında ve sepette sunucu fiyatıyla doğrulanır." },
  { topic: "kurumsal", question: "Kurumsal hesap ile bireysel hesap arasındaki fark nedir?", answer: "Bireysel hesap kendi dijital kartvizitinizi yönetir. Kurumsal hesap ise çalışanları, kartları, şablonları ve yetkileri merkezi olarak yönetir." },
  { topic: "kurumsal", question: "Kurumsal paketi nasıl başlatırım?", answer: "Çalışan sayısı ve kullanım senaryonuzu /kurumsal sayfasındaki teklif formundan gönderin. Talebiniz kayda alınır; ekip 1 iş günü içinde sizinle iletişime geçer. Mevcut kurumsal hesabınız varsa Kurumsal Giriş ile panele dönersiniz." },
  { topic: "teknik", question: "NFC çalışmazsa ne yapmalıyım?", answer: "Kart üzerindeki QR kodu herhangi bir kamera ile okutun; aynı dijital profil açılır. Uygulama indirmeniz gerekmez. Sorun sürerse destek ekibine sipariş veya kart kodunuzla yazın." },
  { topic: "teknik", question: "Hesabıma nasıl girerim?", answer: "Giriş sayfasından bireysel veya kurumsal / ekip bağlamını seçerek e-posta ve şifrenizle oturum açın. Şifrenizi unuttuysanız aynı ekrandan güvenli yenileme bağlantısı isteyebilirsiniz." },
];

function TopicIcon({ value }: { value: IconName }) { return <span className="support-topic-icon" aria-hidden="true"><Icon name={value} variant="line" /></span>; }
function matchesQuery(query: string, topicTitle: string, question: string, answer: string) { if (!query) return true; return `${topicTitle} ${question} ${answer}`.toLocaleLowerCase("tr").includes(query); }

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const legal = getLegalIdentity();
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (rawQuery ?? "").trim();
  const normalized = query.toLocaleLowerCase("tr");
  const visibleFaqs = faqs.filter((item) => { const topic = topics.find((entry) => entry.id === item.topic); return matchesQuery(normalized, topic?.title ?? "", item.question, item.answer); });
  return (
    <main id="main-content" className="support-page">
      <section className="support-hero" aria-labelledby="support-title"><div className="support-hero-inner"><span className="section-kicker">YARDIM MERKEZİ</span><h1 id="support-title">Aradığın cevaba<br />hızlıca ulaş.</h1><p>Kart, profil, sipariş, güvenlik ve kurumsal kullanım hakkında kısa ve net cevaplar.</p><form className="support-search" role="search" action="/destek" method="get"><span className="support-search__icon" aria-hidden="true"><Icon name="search" /></span><input name="q" type="search" defaultValue={query} placeholder="Örn. kayıp kart, kargo, ödeme…" aria-label="Yardım merkezinde ara" enterKeyHint="search" /><button type="submit">Ara</button></form></div></section>
      <section className="support-main" aria-labelledby="support-topics-title"><div className="support-topics"><div className="support-section-head support-section-head--compact"><div><span className="section-kicker">KONULAR</span><h2 id="support-topics-title">Hangi konuda yardıma ihtiyacın var?</h2></div></div><nav className="support-topic-grid" aria-label="Yardım konuları">{topics.map((topic) => <Link className="support-topic-card" key={topic.id} href={`#konu-${topic.id}`}><TopicIcon value={topic.icon} /><div><h3>{topic.title}</h3><p>{topic.text}</p></div><span className="support-topic-arrow" aria-hidden="true">→</span></Link>)}</nav></div>
        <div className="support-faq" id="popular-questions" aria-labelledby="support-faq-title"><div className="support-section-head support-section-head--faq"><div><span className="section-kicker">SIK SORULANLAR</span><h2 id="support-faq-title">{query ? `“${query}” için sonuçlar` : "En çok merak edilenler."}</h2></div>{!query && <p>Konuyu seçebilir veya aşağıdaki sorulardan doğrudan cevaba ulaşabilirsin.</p>}</div>{visibleFaqs.length === 0 ? <div className="support-empty" role="status"><p>“{query}” için kayıtlı bir yardım maddesi yok.</p><a className="home-mockup__link-secondary" href={`mailto:${legal.email}`}>Destek ekibine yaz</a><Link className="home-mockup__link-secondary" href="/urunler/nfc-kart?paket=premium">Premium’u yakından gör</Link></div> : <div className="support-faq-list">{topics.map((topic) => { const items = visibleFaqs.filter((item) => item.topic === topic.id); if (!items.length) return null; return <section className="support-faq-group" key={topic.id} id={`konu-${topic.id}`} aria-labelledby={`konu-${topic.id}-title`}><h3 id={`konu-${topic.id}-title`}>{topic.title}</h3>{items.map((item) => <details key={item.question} open={Boolean(query)}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</section>; })}</div>}</div>
      </section>
      <section className="support-contact" aria-label="Doğrudan destek"><div><span className="section-kicker">DOĞRUDAN DESTEK</span><h2>Cevabı bulamadın mı?</h2></div><p>Sipariş veya kart kodunla bize yaz. Hesabın varsa paneline de doğrudan dönebilirsin.</p><div className="support-contact-actions"><a href={`mailto:${legal.email}`}>Destek ekibine yaz <span aria-hidden="true">→</span></a><Link href="/giris">Hesabıma dön</Link></div></section>
    </main>
  );
}
