import { Suspense } from "react";

import ActivationClient from "./ActivationClient";

function ActivationLoading({ hasToken }: { hasToken: boolean }) {
  return (
    <main id="main-content" className="activation-page p5-activation-page p6-activation-page" aria-busy="true">
      <section className="activation-shell activation-shell--compact" aria-live="polite">
        <span className="section-kicker">HESABI BAĞLA</span>
        <h1>{hasToken ? "Aktivasyon hazırlanıyor…" : "Siparişini hesabına bağla."}</h1>
        <p>{hasToken ? "Sipariş bağlantın kontrol ediliyor." : "Aktivasyon bağlantısı yok. E-postandaki bağlantıyı kullan veya yeni bağlantı iste."}</p>
      </section>
    </main>
  );
}

export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  return (
    <Suspense fallback={<ActivationLoading hasToken={Boolean(token)} />}>
      <ActivationClient />
    </Suspense>
  );
}
