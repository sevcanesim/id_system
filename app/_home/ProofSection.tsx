import { COMMERCIAL_FULFILLMENT } from "../../lib/config/commercial";

export function ProofSection() {
  return (
    <section className="home-premium__proof" aria-labelledby="proof-title">
      <div className="home-premium__proof-head">
        <span className="home-mockup__kicker">GÜVENLE PAYLAŞ</span>
        <h2 id="proof-title">Kartın kalır. Kimliğin güncel kalır.</h2>
        <p>
          NFC veya QR ile canlı profilin anında açılır. Bilgilerin değiştiğinde
          yeniden baskı değil, tek bir güncelleme yeterlidir.
        </p>
      </div>
      <div className="home-premium__principles">
        <article>
          <span>01</span>
          <div>
            <strong>Teslimatın net</strong>
            <p>Kartın {COMMERCIAL_FULFILLMENT.handover.toLocaleLowerCase()}.</p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <strong>Uygulama gerekmez</strong>
            <p>NFC veya QR ile dijital kartvizitin tarayıcıda doğrudan açılır.</p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <strong>Kontrol sende</strong>
            <p>
              Kayıp moduyla kart erişimini kapat; Premium ile bağlantıyı takipte tut.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
