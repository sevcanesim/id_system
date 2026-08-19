import { Suspense } from "react";

import ActivationClient from "./ActivationClient";

function ActivationLoading() {
  return (
    <main id="main-content" className="activation-page p5-activation-page p6-activation-page" aria-busy="true">
      <section className="activation-shell" aria-live="polite">
        <span className="section-kicker">GEÇMİŞ SİPARİŞ</span>
        <h1>Aktivasyon hazırlanıyor…</h1>
        <p>Eski sipariş bağlantın kontrol ediliyor.</p>
      </section>
    </main>
  );
}

export default function ActivationPage() {
  return (
    <Suspense fallback={<ActivationLoading />}>
      <ActivationClient />
    </Suspense>
  );
}
