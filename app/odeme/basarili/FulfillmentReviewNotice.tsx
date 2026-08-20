"use client";

import { useSearchParams } from "next/navigation";

export default function FulfillmentReviewNotice({
  reviewRequired = false,
  setupIncomplete = false,
}: {
  reviewRequired?: boolean;
  setupIncomplete?: boolean;
}) {
  const searchParams = useSearchParams();
  if (setupIncomplete) {
    return (
      <div className="p18-review-notice" role="status" aria-live="polite">
        <strong>Ödeme alındı; şirket kaydı henüz oluşmadı.</strong>
        <span>Yeni bir çekim yapılmaz. Kurulumu bu sayfadan tekrar dene. Panel, şirket oluşunca açılır.</span>
      </div>
    );
  }
  if (!reviewRequired && searchParams.get("review") !== "1") return null;
  return (
    <div className="p18-review-notice" role="status" aria-live="polite">
        <strong>Ödemen alındı; siparişin kontrol ediliyor.</strong>
      <span>Ödeme tekrar alınmayacak. Kart, yenileme veya lisans tanımlama adımında bir tutarsızlık algılandığı için ekip incelemesine alındı.</span>
    </div>
  );
}
