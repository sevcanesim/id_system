import { ButtonLink } from "./ui/Button";

export default function NotFound() {
  return <div className="yi-site">
    <main id="main-content" className="yi-section yi-section--light yi-empty-product">
      <div className="yi-container">
        <span className="yi-hero__eyebrow">404</span>
        <h1>Bu sayfa bulunamadı.</h1>
        <p>Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Anasayfaya dönüp oradan devam edebilirsin.</p>
        <div className="yi-actions">
          <ButtonLink href="/">Anasayfaya dön</ButtonLink>
          <ButtonLink href="/urunler" variant="secondary">Ürünleri incele</ButtonLink>
        </div>
      </div>
    </main>
  </div>;
}
