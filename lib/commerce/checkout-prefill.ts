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

type ShipmentSnapshot = {
  recipient_name?: string | null;
  phone?: string | null;
  address_line?: string | null;
  district?: string | null;
  city?: string | null;
  postal_code?: string | null;
};

function filled(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function firstShipment(value: ShipmentSnapshot | ShipmentSnapshot[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function sessionCheckoutPrefill(user: {
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
}): CheckoutPrefill {
  const meta = user.user_metadata ?? {};
  const fullName = filled(meta.full_name) || filled(meta.name) || filled(meta.fullName);
  const phone = filled(user.phone) || filled(meta.phone) || filled(meta.phone_number);
  return {
    email: user.email?.trim() || undefined,
    recipientName: fullName || undefined,
    phone: phone ? normalizeTrPhone(phone) : undefined,
  };
}

export function mergeCheckoutPrefill<T extends CheckoutPrefill>(form: T, incoming: CheckoutPrefill): T {
  const merged = { ...form };
  if (incoming.email && !filled(form.email)) merged.email = incoming.email;
  if (incoming.recipientName && !filled(form.recipientName)) merged.recipientName = incoming.recipientName;
  if (incoming.phone && !filled(form.phone)) merged.phone = incoming.phone;
  if (incoming.addressLine && !filled(form.addressLine)) merged.addressLine = incoming.addressLine;
  if (incoming.district && !filled(form.district)) merged.district = incoming.district;
  if (incoming.city && !filled(form.city)) merged.city = incoming.city;
  if (incoming.postalCode && !filled(form.postalCode)) merged.postalCode = incoming.postalCode;
  return merged;
}

export async function fetchLastOrderCheckoutPrefill(accessToken: string): Promise<CheckoutPrefill | null> {
  const response = await fetch("/api/commerce/orders", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const history = await response.json() as {
    orders?: Array<{
      customer_name?: string | null;
      customer_phone?: string | null;
      shipping_addresses?: ShipmentSnapshot | ShipmentSnapshot[] | null;
    }>;
  };
  const latestOrder = history.orders?.[0];
  if (!latestOrder) return null;
  const shipment = firstShipment(latestOrder.shipping_addresses);
  const phone = filled(latestOrder.customer_phone) || filled(shipment?.phone);
  return {
    recipientName: filled(latestOrder.customer_name) || filled(shipment?.recipient_name) || undefined,
    phone: phone ? normalizeTrPhone(phone) : undefined,
    addressLine: filled(shipment?.address_line) || undefined,
    district: filled(shipment?.district) || undefined,
    city: filled(shipment?.city) || undefined,
    postalCode: filled(shipment?.postal_code) || undefined,
  };
}
