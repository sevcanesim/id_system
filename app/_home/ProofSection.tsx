export function ProofSection() {
  return (
    <section className="home-premium__proof" aria-labelledby="proof-title">
      <div className="home-premium__proof-head">
        <span className="home-mockup__kicker">GÜVENİLİR VE KOLAY</span>
        <h2 id="proof-title">Paylaşmak için uygulama gerekmez.</h2>
        <p>
          NFC veya QR ile profil doğrudan açılır. Kartın 2 iş gününde
          hazırlanır ve ödeme iyzico üzerinden güvenle tamamlanır.
        </p>
      </div>
      <div className="home-premium__principles">
        <article>
          <span>01</span>
          <div>
            <strong>Hızlı hazırlık</strong>
            <p>Kartın 2 iş günü içinde kargoya hazırlanır.</p>
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
            <strong>Premium takip</strong>
            <p>
              Tanıştığın kişiyi kaydet ve Network Mail ile iletişimi sürdür.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
