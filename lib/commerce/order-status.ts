export const COMMERCE_ORDER_STATUSES = [
  "DRAFT",
  "AWAITING_PAYMENT",
  "PAID",
  "PREPARING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type CommerceOrderStatus = (typeof COMMERCE_ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<CommerceOrderStatus, readonly CommerceOrderStatus[]> = {
  DRAFT: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED", "REFUNDED"],
  PREPARING: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionCommerceOrder(
  current: CommerceOrderStatus,
  next: CommerceOrderStatus,
): boolean {
  if (current === next) return true;
  return ALLOWED_TRANSITIONS[current].includes(next);
}
