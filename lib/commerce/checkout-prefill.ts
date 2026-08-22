import { normalizeTrPhone } from "../form-standards";

export type CheckoutPrefill = {
  recipientName?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  district?: string;
  city?: string;
  postalCode?: string;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function sessionCheckoutPrefill(user: {
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
}): CheckoutPrefill {
  const meta = user.user_metadata ?? {};
  const name = text(meta.full_name) || text(meta.name) || text(meta.fullName);
  const rawPhone = text(user.phone) || text(meta.phone) || text(meta.phone_number);
  return {
    email: user.email?.trim() || undefined,
    recipientName: name || undefined,
    phone: rawPhone ? normalizeTrPhone(rawPhone) : undefined,
  };
}

export function mergeCheckoutPrefill<T extends CheckoutPrefill>(current: T, patch: CheckoutPrefill): T {
  const next = { ...current };
  if (patch.email && !text(current.email)) next.email = patch.email;
  if (patch.recipientName && !text(current.recipientName)) next.recipientName = patch.recipientName;
  if (patch.phone && !text(current.phone)) next.phone = patch.phone;
  if (patch.addressLine && !text(current.addressLine)) next.addressLine = patch.addressLine;
  if (patch.district && !text(current.district)) next.district = patch.district;
  if (patch.city && !text(current.city)) next.city = patch.city;
  if (patch.postalCode && !text(current.postalCode)) next.postalCode = patch.postalCode;
  return next;
}

export async function fetchLastOrderCheckoutPrefill(token: string): Promise<CheckoutPrefill | null> {
  const response = await fetch("/api/commerce/orders", {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = await response.json() as {
    orders?: Array<{
      customer_name?: string | null;
      customer_phone?: string | null;
      shipping_addresses?: Array<{
        recipient_name?: string | null;
        phone?: string | null;
        address_line?: string | null;
        district?: string | null;
        city?: string | null;
        postal_code?: string | null;
      }> | {
        recipient_name?: string | null;
        phone?: string | null;
        address_line?: string | null;
        district?: string | null;
        city?: string | null;
        postal_code?: string | null;
      } | null;
    }>;
  };
  const order = payload.orders?.[0];
  if (!order) return null;
  const addr = Array.isArray(order.shipping_addresses) ? order.shipping_addresses[0] : order.shipping_addresses;
  const phone = text(order.customer_phone) || text(addr?.phone);
  return {
    recipientName: text(order.customer_name) || text(addr?.recipient_name) || undefined,
    phone: phone ? normalizeTrPhone(phone) : undefined,
    addressLine: text(addr?.address_line) || undefined,
    district: text(addr?.district) || undefined,
    city: text(addr?.city) || undefined,
    postalCode: text(addr?.postal_code) || undefined,
  };
}
