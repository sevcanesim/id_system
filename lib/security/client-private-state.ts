const CARD_DRAFT_PREFIX = "yenomi:card-editor:draft:";
const LEGACY_CARD_DRAFT_KEY = "yenomi-card-draft";
const LEGACY_CARD_SLUG_KEY = "yenomi-card-slug";
const CHECKOUT_KEYS = [
  "yenomi_checkout_idempotency_key",
  "yenomi_pending_checkout_order_id",
  "yenomi_checkout_return_path",
];

function hasBrowserStorage() {
  return typeof window !== "undefined";
}

export function clearLegacyUnscopedCardDraft() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(LEGACY_CARD_DRAFT_KEY);
  window.localStorage.removeItem(LEGACY_CARD_SLUG_KEY);
}

export function clearSensitiveBrowserState() {
  if (!hasBrowserStorage()) return;
  clearLegacyUnscopedCardDraft();

  // Remove drafts created by older releases. New profile drafts are never
  // persisted in browser storage because they can contain contact data.
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(CARD_DRAFT_PREFIX)) window.localStorage.removeItem(key);
  }
  for (const key of CHECKOUT_KEYS) window.sessionStorage.removeItem(key);
}
