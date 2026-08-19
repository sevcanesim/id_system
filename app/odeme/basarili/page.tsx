import { Suspense } from "react";


import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import OrderResultGate from "./OrderResultGate";

export default function PaymentSuccessPage() {
  return (
    <main id="main-content" className="order-page p5-result-page">
      <AppHeader context="Ödeme Başarılı" actions={[{ href: "/siparislerim", label: "Siparişlerim" }, { href: "/olustur?source=purchase", label: "Kartvizitimi Hazırla", primary: true }]} />
      <Suspense fallback={<section className="order-success p5-order-success" aria-busy="true"><span className="section-kicker">SİPARİŞ DOĞRULANIYOR</span><h1>Ödeme durumun kontrol ediliyor…</h1></section>}>
        <OrderResultGate />
      </Suspense>
      <AppFooter variant="compact" />
    </main>
  );
}
