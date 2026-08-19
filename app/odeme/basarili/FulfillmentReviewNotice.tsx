"use client";

import { useSearchParams } from "next/navigation";

export default function FulfillmentReviewNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("review") !== "1") return null;
  return (
    <div className="p18-review-notice" role="status" aria-live="polite">
      <strong>Ödemeniz alındı; siparişiniz kontrol ediliyor.</strong>
      <span>Ödeme tekrar alınmayacak. Kart, yenileme veya lisans tanımlama adımında bir tutarsızlık algılandığı için ekip incelemesine alındı.</span>
    </div>
  );
}
