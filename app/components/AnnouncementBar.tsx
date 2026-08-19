/**
 * Shared top service bar for the pre-purchase browsing journey (home →
 * catalog → product detail). P2 QA finding: this strip existed on the
 * homepage and /urunler but not on /urunler/nfc-kart, so the same shopping
 * journey looked like two different systems mid-flow. Deliberately not
 * shown on checkout-sensitive pages (giriş, sepet, checkout, nfc-siparis,
 * ödeme, aktivasyon) — dropping promotional chrome during checkout to reduce
 * distraction is intentional, not an oversight. PublicSiteShell hides this
 * bar on those quiet public routes.
 */
export default function AnnouncementBar() {
  return (
    <div className="p4-announcement" role="note" aria-label="Yenomi ID hizmet bilgileri">
      <span className="p4-announcement__item">Türkiye içi ücretsiz kargo</span>
      <i aria-hidden="true" />
      <span className="p4-announcement__item">2 iş günü hazırlık</span>
      <i aria-hidden="true" />
      <span className="p4-announcement__item">1 yıl dijital hizmet dahil</span>
    </div>
  );
}
