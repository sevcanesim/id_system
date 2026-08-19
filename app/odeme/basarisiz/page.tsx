import { Suspense } from "react";


import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import { Icon } from "../../icons";
import PaymentRetryActions from "./PaymentRetryActions";

export default function PaymentFailedPage() {
  return (
    <main id="main-content" className="order-page p5-result-page">
      <AppHeader context="Ödeme Durumu" actions={[{ href: "/siparislerim", label: "Siparişlerim" }, { href: "/kartim", label: "Kartım", primary: true }]} />
      <section className="order-success payment-failed p5-order-success">
        <span className="p5-result-icon"><Icon name="alert" /></span><span className="section-kicker">ÖDEME TAMAMLANAMADI</span>
        <h1>Ödeme tamamlanamadı.</h1>
        <p>Kartından ücret alınmadıysa endişelenme. Siparişin kayıtlı kaldı; yeni sipariş oluşturmadan aynı ödeme bekleyen sipariş üzerinden tekrar deneyebilirsin.</p>
        <Suspense fallback={null}><PaymentRetryActions /></Suspense>
      </section>
      <AppFooter variant="compact" />
    </main>
  );
}
