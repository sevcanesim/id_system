import { COMMERCIAL_FULFILLMENT } from "../../lib/config/commercial";

export function ProofSection() {
  return (
    <section className="home-premium__proof" aria-labelledby="proof-title">
      <div className="home-premium__proof-head">
        <span className="home-mockup__kicker">GÜVENİLİR VE KOLAY</span>
        <h2 id="proof-title">Paylaşmak için uygulama gerekmez.</h2>
        <p>
          NFC veya QR ile profilin anında açılır. Kartın {COMMERCIAL_FULFILLMENT.handover.toLocaleLowerCase()};
          ödeme PayTR&apos;ın güvenli sayfasında tamamlanır.
        </p>
      </div>
      <div className="home-premium__principles">
        <article>
          <span>01</span>
          <div>
            <strong>Net teslimat</strong>
            <p>Kartın {COMMERCIAL_FULFILLMENT.handover.toLocaleLowerCase()}.</p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <strong>Uygulamasız paylaşım</strong>
            <p>NFC veya QR ile dijital kartvizitin tarayıcıda açılır.</p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <strong>Bağlantıyı sürdür</strong>
            <p>
              Tanıştığın kişiyi kaydet, Network Mail ile doğru zamanda iletişime geç.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
