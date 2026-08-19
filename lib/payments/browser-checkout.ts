const IDEMPOTENCY_KEY = "yenomi_checkout_idempotency_key";
const PENDING_ORDER_KEY = "yenomi_pending_order_id";
const RETURN_PATH_KEY = "yenomi_checkout_return_path";

export function getOrCreateCheckoutIdempotencyKey(): string {
  if (typeof window === "undefined") return "";
  const existing = window.sessionStorage.getItem(IDEMPOTENCY_KEY);
  if (existing) return existing;
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
  window.sessionStorage.setItem(IDEMPOTENCY_KEY, value);
  return value;
}

export function rotateCheckoutIdempotencyKey(): string {
  if (typeof window === "undefined") return "";
  window.sessionStorage.removeItem(IDEMPOTENCY_KEY);
  return getOrCreateCheckoutIdempotencyKey();
}

export function getPendingCheckoutOrderId(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PENDING_ORDER_KEY);
}


export function clearPendingCheckoutOrderId(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_ORDER_KEY);
}

export function setPendingCheckoutOrderId(orderId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_ORDER_KEY, orderId);
}

export function setCheckoutReturnPath(path: "/checkout" | "/nfc-siparis"): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(RETURN_PATH_KEY, path);
}

export function getCheckoutReturnPath(): "/checkout" | "/nfc-siparis" {
  if (typeof window === "undefined") return "/checkout";
  return window.sessionStorage.getItem(RETURN_PATH_KEY) === "/nfc-siparis" ? "/nfc-siparis" : "/checkout";
}

export function clearCheckoutSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(IDEMPOTENCY_KEY);
  window.sessionStorage.removeItem(PENDING_ORDER_KEY);
  window.sessionStorage.removeItem(RETURN_PATH_KEY);
}
