const CARD_DRAFT_PREFIX = "yenomi:card-editor:draft:";
const LEGACY_CARD_DRAFT_KEY = "yenomi-card-draft";
const LEGACY_CARD_SLUG_KEY = "yenomi-card-slug";
const ACTIVATION_TOKEN_KEY = "yenomi-activation-token";
const CHECKOUT_KEYS = [
  "yenomi_checkout_idempotency_key",
  "yenomi_pending_checkout_order_id",
  "yenomi_checkout_return_path",
];

function hasBrowserStorage() {
  return typeof window !== "undefined";
}

function isValidUserId(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value));
}

export function personalCardDraftKey(userId: string) {
  if (!isValidUserId(userId)) throw new Error("INVALID_USER_ID");
  return `${CARD_DRAFT_PREFIX}${userId}`;
}

export function readPersonalCardDraft(userId: string) {
  if (!hasBrowserStorage()) return null;
  return window.localStorage.getItem(personalCardDraftKey(userId));
}

export function writePersonalCardDraft(userId: string, serializedDraft: string) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(personalCardDraftKey(userId), serializedDraft);
}

export function clearLegacyUnscopedCardDraft() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(LEGACY_CARD_DRAFT_KEY);
  window.localStorage.removeItem(LEGACY_CARD_SLUG_KEY);
}

export function clearSensitiveBrowserState() {
  if (!hasBrowserStorage()) return;
  clearLegacyUnscopedCardDraft();
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(CARD_DRAFT_PREFIX)) window.localStorage.removeItem(key);
  }
  window.sessionStorage.removeItem(ACTIVATION_TOKEN_KEY);
  for (const key of CHECKOUT_KEYS) window.sessionStorage.removeItem(key);
}
