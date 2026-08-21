/**
 * Funnel event stub. This is not GA4, GTM, PostHog, or any live analytics
 * product. `window.dataLayer.push` is a local array so callers have a stable
 * `track()` API; nothing is sent to a vendor until a provider is chosen and
 * this function is wired for real. Do not invent totals or dashboards from it.
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
