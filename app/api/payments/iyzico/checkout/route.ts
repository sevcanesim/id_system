import { NextResponse } from "next/server";

/**
 * Eski nfc_orders ödeme başlangıç noktası v22.15 itibarıyla kapatıldı.
 * Yeni siparişlerin tamamı commerce_orders üzerinden /api/commerce/checkout
 * endpoint'ine gitmelidir. Endpoint bir süre daha 410 döndürerek eski istemcilerin
 * yanlışlıkla ikinci sipariş/ödeme sistemi oluşturmasını engeller.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Bu ödeme akışı artık kullanılmıyor. Lütfen siparişi güncel sepet ve ödeme ekranından tamamlayın.",
      code: "LEGACY_CHECKOUT_RETIRED",
      redirectTo: "/sepet",
    },
    { status: 410 },
  );
}
