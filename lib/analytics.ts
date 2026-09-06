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
}
