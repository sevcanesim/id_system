import { resolveRecoverOrderId } from "./pending-order-cookie";

export type RecoverIntent =
  | { kind: "mismatch" }
  | { kind: "missing" }
  | { kind: "cookie"; orderId: string }
  | { kind: "owner-required"; orderId: string };

/**
 * Cookie possession is enough to recover that order. A body UUID without the
 * pending-order cookie is only a candidate: the route must still prove the
 * caller owns the order. Body UUID alone never authorizes settlement.
 */
export function resolveRecoverIntent(cookieOrderId: string | null, bodyOrderId: string | null): RecoverIntent {
  const resolved = resolveRecoverOrderId(cookieOrderId, bodyOrderId);
  if (resolved.mismatch) return { kind: "mismatch" };
  if (!resolved.orderId) return { kind: "missing" };
  if (cookieOrderId && resolved.orderId === cookieOrderId) {
    return { kind: "cookie", orderId: resolved.orderId };
  }
  return { kind: "owner-required", orderId: resolved.orderId };
}

/** Guest orders (null owner) recover only via cookie possession, never via a guessed UUID. */
export function ownerMayRecover(orderOwnerId: string | null, requestUserId: string): boolean {
  return Boolean(orderOwnerId && requestUserId && orderOwnerId === requestUserId);
}
