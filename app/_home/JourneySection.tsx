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
        <h2 id="how-it-works-title">Paylaş. Kaydet. Takip et.</h2>
        <p>
          Premium, kartvizit paylaşımından tanışma sonrasındaki profesyonel
          takibe kadar tek akış sunar.
        </p>
      </div>
      <ol className="home-premium__journey-steps">
        <li>
          <span>01</span>
          <div>
            <h3>Paylaş</h3>
            <p>NFC veya QR ile güncel dijital kartvizitini aç.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <h3>Bağlantıyı kaydet</h3>
            <p>Tanıştığın kişileri ve görüşmelerini tek yerde tut.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <h3>Takip et</h3>
            <p>Network Mail ile görüşme sonrası iletişimi sürdür.</p>
          </div>
        </li>
      </ol>
      <div className="home-premium__journey-action">
        <p>
          <strong>
            <Link href="/nasil-calisir">
              Nasıl çalıştığını detaylı gör →
            </Link>
          </strong>
        </p>
      </div>
    </section>
  );
}
