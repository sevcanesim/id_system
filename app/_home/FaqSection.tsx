import Link from "next/link";

const faqItems = [
  [
    "Premium ne ekliyor?",
    "Premium; NFC + QR kart ve canlı profile ek olarak toplantı, sunum, kişi yönetimi ve 100 Network Mail kredisi içerir. Tanışma sonrasındaki takip akışını tek üründe toplar.",
  ],
  [
    "Uygulama indirmek gerekiyor mu?",
    "Hayır. NFC veya QR ile profil tarayıcıda doğrudan açılır.",
  ],
  [
    "Bilgilerim değişirse kartı yeniden bastırır mıyım?",
    "Hayır. Fiziksel kart aynı kalır; profilindeki bilgileri güncellersin.",
  ],
  [
    "Kartımı kaybedersem ne olur?",
    "Kart erişimini panelden kapatabilir, kayıp moduyla kontrolü koruyabilirsin.",
  ],
  [
    "NFC kullanılmazsa ne olur?",
    "Kart üzerindeki QR kod aynı profile bağlıdır; QR ile de profil açılır.",
  ],
  [
    "Ödeme kartı bilgilerim Yenomi’de tutuluyor mu?",
    "Hayır. Kart bilgileri Yenomi’de saklanmaz; ödeme iyzico altyapısı üzerinden gerçekleşir.",
  ],
] as const;

export function FaqSection() {
  return (
    <section className="home-sales-faq" aria-labelledby="faq-title">
      <div className="home-sales-faq-intro">
        <span className="home-mockup__kicker">SIK SORULANLAR</span>
        <h2 id="faq-title">Satın almadan önce bilmen gerekenler.</h2>
      </div>
      <div className="home-sales-faq-list">
        {faqItems.map(([q, a], i) => (
          <details className="home-sales-faq-item" key={q} open={i === 0}>
            <summary>
              <span>{q}</span>
              <i aria-hidden="true">+</i>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <div className="home-sales-support">
        <Link href="/destek">Yardım merkezine git →</Link>
      </div>
    </section>
  );
}
