import { Suspense } from "react";


import AppFooter from "../../components/AppFooter";
import OrderResultGate from "./OrderResultGate";
import PaymentSuccessHeader from "./PaymentSuccessHeader";

const PAYMENT_SUCCESS_ACTIONS = [
  { href: "/siparislerim", label: "Siparişlerim" },
  { href: "/olustur?source=purchase", label: "Kartvizitimi Hazırla", primary: true as const },
];

export default function PaymentSuccessPage() {
  return (
    <main id="main-content" className="order-page p5-result-page">
      <Suspense fallback={null}>
        <PaymentSuccessHeader fallbackActions={PAYMENT_SUCCESS_ACTIONS} />
      </Suspense>
      <Suspense fallback={<section className="order-success p5-order-success" aria-busy="true"><span className="section-kicker">SİPARİŞ DOĞRULANIYOR</span><h1>Ödeme durumun kontrol ediliyor…</h1></section>}>
        <OrderResultGate />
      </Suspense>
      <AppFooter variant="compact" />
    </main>
  );
}
