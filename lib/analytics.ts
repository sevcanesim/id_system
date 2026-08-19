/**
 * Minimal satış hunisi olay izleme yardımcı fonksiyonu.
 *
 * Denetim raporu referansı: P1 — "Satış hunisi ölçülmüyor. En az şu
 * eventler gerekir: hero CTA, oluşturma başlangıcı, profil yayınlama,
 * NFC ürün görüntüleme, sipariş başlangıcı, ödeme başlangıcı, ödeme
 * başarısı."
 *
 * Bu modül henüz bir analytics sağlayıcısına (GA4, PostHog, Plausible vb.)
 * bağlı DEĞİLDİR — hangi sağlayıcının kullanılacağı iş kararına bağlıdır.
 * Şimdilik `window.dataLayer` üzerine (GA4/GTM uyumlu) push eder ve
 * geliştirme ortamında konsola yazar; bir sağlayıcı seçildiğinde yalnızca
 * bu dosyanın `track` fonksiyonu güncellenmesi yeterlidir — çağıran kod
 * değişmez.
 */

export type FunnelEvent =
  | "hero_cta_click"
  | "creation_start"
  | "profile_publish"
  | "nfc_product_view"
  | "order_start"
  | "payment_start"
  | "payment_success"
  | "lost_mode_click"
  | "cart_remove"
  | "backup_card_added"
  | "checkout_started";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: FunnelEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params, timestamp: new Date().toISOString() });
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[funnel]", event, params);
  }
}
