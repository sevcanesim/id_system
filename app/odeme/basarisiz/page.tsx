import { Suspense } from "react";


import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import { Icon } from "../../icons";
import PaymentRetryActions from "./PaymentRetryActions";

export default function PaymentFailedPage() {
  return (
    <main id="main-content" className="order-page p5-result-page">
      <AppHeader showDefaultCta={false} />
      <section className="order-success payment-failed p5-order-success transaction-state-card">
        <span className="p5-result-icon"><Icon name="alert" /></span><span className="section-kicker">ÖDEME TAMAMLANAMADI</span>
        <h1>Ödeme tamamlanmadı. Sepetin duruyor.</h1>
        <p>Kartından çekim olmadıysa ücret alınmaz. Aynı siparişi yeniden denemen yeterli; yeni sepet kurmana gerek yok.</p>
        <Suspense fallback={null}><PaymentRetryActions /></Suspense>
      </section>
      <AppFooter variant="compact" />
    </main>
  );
}
