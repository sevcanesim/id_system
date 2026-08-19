"use client";

export default function CorporatePanelError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="business-console p10-corporate-platform">
      <section className="enterprise-route-error" role="alert">
        <span>YENOMI BUSINESS</span>
        <h1>Kurumsal panel yüklenemedi.</h1>
        <p>Panel beklenmeyen bir sorunla karşılaştı. Verileriniz korunur; ekranı yeniden deneyebilirsiniz.</p>
        <button type="button" onClick={() => reset()}>Yeniden Dene</button>
      </section>
    </main>
  );
}
