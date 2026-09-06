import Link from "next/link";

export function JourneySection() {
  return (
    <section
      id="nasil-calisir"
      className="home-premium__journey"
      aria-labelledby="how-it-works-title"
    >
      <div className="home-premium__journey-head">
        <span className="home-mockup__kicker">NASIL ÇALIŞIR</span>
        <h2 id="how-it-works-title">Paylaşın. Bağlantıyı koruyun. Etkiyi sürdürün.</h2>
        <p>
          Bireysel Premium, ilk dokunuştan tanışma sonrasındaki özenli takibe
          kadar tek bir akış sunar.
        </p>
      </div>
      <ol className="home-premium__journey-steps">
        <li>
          <span>01</span>
          <div>
            <h3>Paylaşın</h3>
            <p>NFC veya QR ile güncel dijital kimliğinizi açın.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <h3>Bağlantıyı koruyun</h3>
            <p>Tanıştığınız kişileri ve görüşmeleri tek yerde tutun.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <h3>İlerletin</h3>
            <p>Network Mail ile görüşme sonrasındaki iletişimi sürdürün.</p>
          </div>
        </li>
      </ol>
      <div className="home-premium__journey-action">
        <p>
          <strong>
            <Link href="/nasil-calisir">
              Deneyimin tamamını görün →
            </Link>
          </strong>
        </p>
      </div>
    </section>
  );
}
