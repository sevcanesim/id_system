import { Icon } from "../icons";

const comparisonRows = [
  [
    "Bilgilerin değişti",
    "Yeniden baskı gerekir",
    "Profiliniz anında güncel kalır",
  ],
  ["Paylaşım", "Basılı bilgilerle sınırlı", "NFC + QR + canlı profil"],
  [
    "Kart kayboldu",
    "Kontrol sizde değildir",
    "Kayıp moduyla erişimi kapatırsınız",
  ],
  ["İletişim kaydı", "Manuel giriş gerekir", "Tek dokunuşla rehbere kaydedilir"],
] as const;

export function ComparisonSection() {
  return (
    <section
      className="home-sales-comparison"
      aria-labelledby="comparison-title"
    >
      <div className="home-sales-comparison-head">
        <span className="home-mockup__kicker">NEDEN YENOMI ID?</span>
        <h2 id="comparison-title">
          Kart aynı kalır.
          <br />
          Kimliğiniz ilerler.
        </h2>
      </div>
      <div
        className="home-sales-comparison-table"
        role="table"
        aria-label="Klasik kartvizit ve Yenomi ID karşılaştırması"
        tabIndex={0}
      >
        {" "}
        <div className="home-sales-comparison-header" role="row">
          <span>Durum</span>
          <span>Klasik kartvizit</span>
          <span>Yenomi ID</span>
        </div>
        {comparisonRows.map(([a, b, c]) => (
          <div className="home-sales-comparison-row" role="row" key={a}>
            <strong>{a}</strong>
            <span>{b}</span>
            <span>
              <Icon name="check" />
              {c}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
