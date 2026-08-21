import { ButtonLink } from "./ui/Button";

export default function NotFound() {
  return <div className="yi-site">
    <main id="main-content" className="yi-section yi-section--light yi-empty-product">
      <div className="yi-container">
        <span className="yi-hero__eyebrow">404</span>
        <h1>Bu sayfa yok. Kartın duruyor.</h1>
        <p>Bağlantı taşınmış olabilir. Ana sayfaya dön veya NFC kartını doğrudan al.</p>
        <div className="yi-actions">
          <ButtonLink href="/">Ana sayfaya dön</ButtonLink>
          <ButtonLink href="/urunler/nfc-kart" variant="ghost">NFC Kartı Satın Al</ButtonLink>
        </div>
      </div>
    </main>
  </div>;
}
