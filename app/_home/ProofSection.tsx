import { COMMERCIAL_FULFILLMENT } from "../../lib/config/commercial";

export function ProofSection() {
  return (
    <section className="home-premium__proof" aria-labelledby="proof-title">
      <div className="home-premium__proof-head">
        <span className="home-mockup__kicker">GÜVENLE PAYLAŞ</span>
        <h2 id="proof-title">Kartınız sabit. Etkiniz güncel.</h2>
        <p>
          NFC veya QR ile canlı profiliniz anında açılır. Bilginiz değiştiğinde
          yeniden baskı değil, tek bir güncelleme yeterlidir.
        </p>
      </div>
      <div className="home-premium__principles">
        <article>
          <span>01</span>
          <div>
            <strong>Başlangıç net</strong>
            <p>Kartınız {COMMERCIAL_FULFILLMENT.handover.toLocaleLowerCase()}.</p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <strong>Uygulama gerekmez</strong>
            <p>NFC veya QR ile dijital kimliğiniz tarayıcıda doğrudan açılır.</p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <strong>Kontrol sizde</strong>
            <p>
              Kayıp moduyla kart erişimini kapatın; Premium ile bağlantılarınızı takipte tutun.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
