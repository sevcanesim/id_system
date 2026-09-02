// Sipariş sınıflandırma ve durum yardımcıları. app/admin/page.tsx'ten
// çıkarıldı; davranış birebir korunmuştur. app/admin/overview/page.tsx da
// aynı sınıflandırma mantığını kullanır (tek kaynak, kopya yok).

export type Status = "PAID" | "PREPARING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type OrderStatus = Status | "DRAFT" | "AWAITING_PAYMENT";
export type AudienceFilter = "ALL" | "INDIVIDUAL" | "CORPORATE";
export type ProductFilter = "ALL" | "STANDARD" | "PREMIUM" | "PREMIUM_UPGRADE" | "NETWORK_MAIL" | "CORPORATE_PACKAGE" | "CAPACITY" | "CARD" | "RENEWAL";
export type OperationsFilter = "ALL" | "PAYMENT_PENDING" | "ACTIVATION_PENDING" | "ACTIVE" | "FULFILLMENT" | "SHIPPING" | "COMPLETED" | "ISSUE";
export type ShippingAddress = { recipient_name: string; phone: string; address_line: string; district: string; city: string; postal_code: string | null; delivery_note: string | null };
export type OrderItem = { id: string; product_name: string; product_kind: string; quantity: number; configuration?: Record<string, unknown> | null };
export type Order = {
  id: string; order_number: string; customer_name: string | null; customer_phone: string | null; guest_email: string;
  status: OrderStatus; total_kurus: number; paid_at: string | null; created_at: string;
  tracking_company: string | null; tracking_number: string | null; activation_claimed_at: string | null;
  company_name: string | null; tax_number: string | null; tax_office: string | null;
  commerce_order_items: OrderItem[]; shipping_addresses: ShippingAddress[] | ShippingAddress | null;
};

export const labels: Record<Status, string> = { PAID: "Ödeme alındı", PREPARING: "Hazırlanıyor", SHIPPED: "Kargoya verildi", COMPLETED: "Tamamlandı", CANCELLED: "İptal", REFUNDED: "İade" };
export const orderStatusLabels: Record<OrderStatus, string> = { DRAFT: "Taslak", AWAITING_PAYMENT: "Ödeme bekliyor", ...labels };
export const productLabels: Record<Exclude<ProductFilter, "ALL">, string> = { STANDARD: "Standard", PREMIUM: "Premium", PREMIUM_UPGRADE: "Premium yükseltme", NETWORK_MAIL: "Network Mail", CORPORATE_PACKAGE: "Kurumsal paket", CAPACITY: "Ek kapasite", CARD: "Fiziksel / yedek kart", RENEWAL: "Yenileme" };
export const operationsLabels: Record<Exclude<OperationsFilter, "ALL">, string> = { PAYMENT_PENDING: "Ödeme bekliyor", ACTIVATION_PENDING: "Aktivasyon bekliyor", ACTIVE: "Hesap aktif", FULFILLMENT: "Üretim / hazırlık", SHIPPING: "Kargoda", COMPLETED: "Tamamlandı", ISSUE: "İptal / iade" };

export function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }
export function money(value: number) { return `${(value / 100).toLocaleString("tr-TR")} TL`; }
export function itemSku(item: OrderItem) { const sku = item.configuration?.sku; return typeof sku === "string" ? sku.toUpperCase() : ""; }
export function classifyProduct(item: OrderItem): Exclude<ProductFilter, "ALL"> {
  const sku = itemSku(item); const text = `${sku} ${item.product_name} ${item.product_kind}`.toLocaleUpperCase("tr-TR");
  if (text.includes("PREMIUM") && (text.includes("UPGRADE") || text.includes("YÜKSELT"))) return "PREMIUM_UPGRADE";
  if (text.includes("NETWORK") && text.includes("MAIL")) return "NETWORK_MAIL";
  if (sku.startsWith("YENOMI-BUSINESS-SEATS-") || text.includes("EK KAPASİTE") || text.includes("EK KULLANICI")) return "CAPACITY";
  if (sku.startsWith("YENOMI-CORP-") || text.includes("KURUMSAL")) return "CORPORATE_PACKAGE";
  if (text.includes("YENİLEME") || text.includes("RENEWAL")) return "RENEWAL";
  if (text.includes("PREMIUM")) return "PREMIUM";
  if (text.includes("YEDEK") || text.includes("ADDITIONAL_CARD") || text.includes("FİZİKSEL KART")) return "CARD";
  return "STANDARD";
}
export function orderAudience(order: Order): Exclude<AudienceFilter, "ALL"> {
  return order.commerce_order_items.some((item) => {
    const sku = itemSku(item); const text = `${item.product_name} ${item.product_kind}`.toLocaleUpperCase("tr-TR");
    return sku.startsWith("YENOMI-CORP-") || sku.startsWith("YENOMI-BUSINESS-SEATS-") || typeof item.configuration?.organizationId === "string" || text.includes("KURUMSAL");
  }) ? "CORPORATE" : "INDIVIDUAL";
}
export function orderOperationsState(order: Order): Exclude<OperationsFilter, "ALL"> {
  if (["CANCELLED", "REFUNDED"].includes(order.status)) return "ISSUE";
  if (["DRAFT", "AWAITING_PAYMENT"].includes(order.status)) return "PAYMENT_PENDING";
  if (order.status === "SHIPPED") return "SHIPPING";
  if (order.status === "COMPLETED") return "COMPLETED";
  if (order.status === "PREPARING") return "FULFILLMENT";
  if (order.status === "PAID" && !order.activation_claimed_at) return "ACTIVATION_PENDING";
  return "ACTIVE";
}
export function needsPhysicalFulfillment(order: Order) {
  return order.commerce_order_items.some((item) => {
    const category = classifyProduct(item); const text = `${item.product_name} ${item.product_kind} ${itemSku(item)}`.toLocaleUpperCase("tr-TR");
    if (["PREMIUM_UPGRADE", "NETWORK_MAIL", "CAPACITY", "RENEWAL"].includes(category)) return false;
    return category === "CARD" || category === "STANDARD" || category === "CORPORATE_PACKAGE" || text.includes("NFC") || text.includes("KART");
  });
}
export function attentionLabel(order: Order) {
  const state = orderOperationsState(order);
  if (state === "PAYMENT_PENDING") return "Ödeme bekleniyor";
  if (state === "ACTIVATION_PENDING") return "Aktivasyon gerekli";
  if (state === "FULFILLMENT") return needsPhysicalFulfillment(order) ? "Üretim aksiyonu" : "Fulfillment";
  if (state === "SHIPPING") return "Teslimat takip";
  if (state === "ISSUE") return "İnceleme";
  return operationsLabels[state];
}
