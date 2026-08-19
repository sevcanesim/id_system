import { COMMERCIAL_SKUS } from "./config/commercial";

export type ProductKind = "BUSINESS_CARD" | "HEALTH_CARD" | "NFC_PHYSICAL_CARD";

export type CartItem = {
  cartItemId: string;
  productId: string;
  variantSku?: string;
  kind: ProductKind;
  name: string;
  unitPriceKurus: number;
  quantity: number;
  configuration?: Record<string, unknown>;
};

export type NewCartItem = Omit<CartItem, "cartItemId"> & { cartItemId?: string };

const LEGACY_KEY = "yenomi-cart-v1";
const OWNER_KEY = "yenomi-cart-owner-v2";
const CART_PREFIX = "yenomi-cart-v2:";
const GUEST_OWNER = "guest";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function stableCartConfiguration(configuration?: Record<string, unknown>): string {
  return JSON.stringify(stableValue(configuration ?? {}));
}

export function createCartItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeItem(item: Partial<CartItem>): CartItem | null {
  if (!item.productId || !item.kind || !item.name || typeof item.unitPriceKurus !== "number") return null;
  const legacyInitialOffer = item.productId === "nfc-kart" && !item.variantSku && !item.configuration?.organizationId;
  return {
    cartItemId: item.cartItemId || createCartItemId(),
    productId: item.productId,
    variantSku: legacyInitialOffer ? COMMERCIAL_SKUS.INITIAL : item.variantSku,
    kind: item.kind,
    name: item.name,
    unitPriceKurus: item.unitPriceKurus,
    quantity: Math.max(1, Number(item.quantity) || 1),
    configuration: item.configuration,
  };
}

function currentOwner(): string {
  if (typeof window === "undefined") return GUEST_OWNER;
  return window.localStorage.getItem(OWNER_KEY) || GUEST_OWNER;
}

function keyFor(owner: string): string {
  return `${CART_PREFIX}${owner || GUEST_OWNER}`;
}

function readItemsFromKey(key: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    let migrated = false;
    const items = parsed.flatMap((raw) => {
      const item = normalizeItem(raw);
      if (!item) return [];
      if (!raw.cartItemId) migrated = true;
      return [item];
    });
    if (migrated) window.localStorage.setItem(key, JSON.stringify(items));
    return items;
  } catch {
    return [];
  }
}

function writeItemsToKey(key: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

function mergeItems(base: CartItem[], incoming: CartItem[]): CartItem[] {
  const next = base.map((item) => ({ ...item }));
  for (const input of incoming) {
    const existing = next.find(
      (item) =>
        item.productId === input.productId &&
        item.variantSku === input.variantSku &&
        stableCartConfiguration(item.configuration) === stableCartConfiguration(input.configuration),
    );
    if (existing) existing.quantity += input.quantity;
    else next.push({ ...input, cartItemId: input.cartItemId || createCartItemId() });
  }
  return next;
}

function dispatchCartChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("yenomi-cart-change"));
}

/**
 * Switches the browser cart to the authenticated user or to the isolated guest cart.
 * When a guest signs in, their guest cart is moved into that user's cart exactly once.
 * When a user signs out, the guest cart remains separate, so account-owned items never
 * leak into the logged-out experience.
 */
export function setCartOwner(userId: string | null, options: { claimGuest?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const nextOwner = userId || GUEST_OWNER;
  const previousOwner = currentOwner();
  const claimGuest = options.claimGuest !== false;

  if (userId) {
    const userKey = keyFor(userId);
    let userItems = readItemsFromKey(userKey);

    // v1 carts had no ownership. For privacy, they are NEVER shown to guests.
    // They are only claimed once we know the authenticated user id.
    const legacyItems = readItemsFromKey(LEGACY_KEY);
    if (legacyItems.length) {
      userItems = mergeItems(userItems, legacyItems);
      window.localStorage.removeItem(LEGACY_KEY);
    }

    if (claimGuest && previousOwner === GUEST_OWNER) {
      const guestKey = keyFor(GUEST_OWNER);
      const guestItems = readItemsFromKey(guestKey);
      if (guestItems.length) {
        userItems = mergeItems(userItems, guestItems);
        window.localStorage.removeItem(guestKey);
      }
    }

    writeItemsToKey(userKey, userItems);
  }

  window.localStorage.setItem(OWNER_KEY, nextOwner);
  dispatchCartChange();
}

export function clearLegacyCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  return readItemsFromKey(keyFor(currentOwner()));
}

export function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  writeItemsToKey(keyFor(currentOwner()), items);
  dispatchCartChange();
}

export function addCartItem(input: NewCartItem) {
  const items = readCart();
  const existing = items.find(
    (item) =>
      item.productId === input.productId &&
      item.variantSku === input.variantSku &&
      stableCartConfiguration(item.configuration) === stableCartConfiguration(input.configuration),
  );

  if (existing) {
    existing.quantity += input.quantity;
  } else {
    items.push({ ...input, cartItemId: input.cartItemId || createCartItemId() });
  }
  writeCart(items);
}

export function updateCartItemQuantity(items: CartItem[], cartItemId: string, quantity: number): CartItem[] {
  return items.map((item) =>
    item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item,
  );
}

export function removeCartItem(items: CartItem[], cartItemId: string): CartItem[] {
  return items.filter((item) => item.cartItemId !== cartItemId);
}

export function cartCount() {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}
