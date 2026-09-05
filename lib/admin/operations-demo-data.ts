type OperationsPayload = {
  printQueue: Array<Record<string, unknown>>;
  premiumUsers: Array<Record<string, unknown>>;
  capacityTerms: Array<Record<string, unknown>>;
  renewalNotices: Array<Record<string, unknown>>;
  mailAdjustments: Array<Record<string, unknown>>;
  auditLog: Array<Record<string, unknown>>;
};

const ago = (days: number, hours = 0) => new Date(Date.now() - ((days * 24 + hours) * 60 * 60 * 1000)).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

export function createAdminOperationsDemoData(): OperationsPayload {
  const users = [
    ["10000000-0000-4000-8000-000000000001", "Ayşe Yılmaz", "qa26.operations.ayse@yenomi.test"],
    ["10000000-0000-4000-8000-000000000002", "Mert Demir", "qa26.operations.mert@yenomi.test"],
    ["10000000-0000-4000-8000-000000000003", "Elif Kaya", "qa26.operations.elif@yenomi.test"],
  ] as const;

  const card = (n: number, status: string, name: string, email: string, extra: Record<string, unknown> = {}) => ({
    id: `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    operations_status: status,
    carrier: null,
    tracking_number: null,
    print_requested_at: ago(4 - n),
    print_started_at: status === "PRINTING" ? ago(1, 2) : null,
    print_approved_at: ["SHIPPING_PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) ? ago(1) : null,
    shipped_at: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status) ? ago(0, 8) : null,
    out_for_delivery_at: ["OUT_FOR_DELIVERY", "DELIVERED"].includes(status) ? ago(0, 3) : null,
    delivered_at: status === "DELIVERED" ? ago(0, 1) : null,
    order: { order_number: `YNO-DEMO-${202600 + n}`, customer_name: name, guest_email: email, paid_at: ago(7 - n) },
    item: { product_name: n % 2 ? "Yenomi ID Premium Fiziksel Kart" : "Yenomi ID Standard Fiziksel Kart" },
    ...extra,
  });

  return {
    printQueue: [
      card(1, "PRINT_PENDING", "Ayşe Yılmaz", "qa26.operations.ayse@yenomi.test"),
      card(2, "PRINTING", "Mert Demir", "qa26.operations.mert@yenomi.test"),
      card(3, "SHIPPING_PENDING", "Elif Kaya", "qa26.operations.elif@yenomi.test"),
      card(4, "IN_TRANSIT", "Can Arslan", "qa26.operations.can@yenomi.test", { carrier: "Yurtiçi Kargo", tracking_number: "DEMO-784521963" }),
      card(5, "OUT_FOR_DELIVERY", "Selin Koç", "qa26.operations.selin@yenomi.test", { carrier: "Aras Kargo", tracking_number: "DEMO-458721369" }),
    ],
    premiumUsers: users.map(([userId, name, email], index) => ({
      id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      user_id: userId,
      package_code: "INDIVIDUAL_PREMIUM",
      status: "ACTIVE",
      network_mail_limit: 100,
      network_mail_remaining: [82, 37, 100][index],
      expires_at: ahead([211, 46, 358][index]),
      profile: { name, email },
    })),
    capacityTerms: [
      { id: "40000000-0000-4000-8000-000000000001", organization_id: "50000000-0000-4000-8000-000000000001", source_order_id: "60000000-0000-4000-8000-000000000001", card_count: 25, starts_at: ago(335), expires_at: ahead(30), renewal_price_kurus: 625000, currency: "TRY", status: "ACTIVE", organization: { name: "Atlas Endüstri A.Ş.", corporate_id: "YNO-CORP-1042" } },
      { id: "40000000-0000-4000-8000-000000000002", organization_id: "50000000-0000-4000-8000-000000000001", source_order_id: "60000000-0000-4000-8000-000000000002", card_count: 10, starts_at: ago(120), expires_at: ahead(245), renewal_price_kurus: 275000, currency: "TRY", status: "ACTIVE", organization: { name: "Atlas Endüstri A.Ş.", corporate_id: "YNO-CORP-1042" } },
      { id: "40000000-0000-4000-8000-000000000003", organization_id: "50000000-0000-4000-8000-000000000002", source_order_id: "60000000-0000-4000-8000-000000000003", card_count: 50, starts_at: ago(350), expires_at: ahead(15), renewal_price_kurus: 1125000, currency: "TRY", status: "ACTIVE", organization: { name: "Nova Savunma Ltd.", corporate_id: "YNO-CORP-2088" } },
    ],
    renewalNotices: [
      { id: "70000000-0000-4000-8000-000000000001", term_id: "40000000-0000-4000-8000-000000000001", organization_id: "50000000-0000-4000-8000-000000000001", due_at: ahead(30), renewal_price_kurus: 625000, currency: "TRY", status: "PENDING", invoice_reference: null },
      { id: "70000000-0000-4000-8000-000000000002", term_id: "40000000-0000-4000-8000-000000000003", organization_id: "50000000-0000-4000-8000-000000000002", due_at: ahead(15), renewal_price_kurus: 1125000, currency: "TRY", status: "NOTIFIED", invoice_reference: null },
    ],
    mailAdjustments: [
      { id: "80000000-0000-4000-8000-000000000001", user_id: users[0][0], organization_id: null, delta: 10, balance_before: 72, balance_after: 82, reason: "Demo: müşteri hizmetleri kota düzeltmesi", created_at: ago(2) },
      { id: "80000000-0000-4000-8000-000000000002", user_id: users[1][0], organization_id: null, delta: 20, balance_before: 17, balance_after: 37, reason: "Demo: kampanya kredisi", created_at: ago(5) },
    ],
    auditLog: [
      { id: "90000000-0000-4000-8000-000000000001", actor_user_id: null, action: "PHYSICAL_CARD_START_PRINT", target_table: "commerce_physical_card_units", target_id: "20000000-0000-4000-8000-000000000002", before_value: { status: "PRINT_PENDING" }, after_value: { status: "PRINTING" }, created_at: ago(1, 2) },
      { id: "90000000-0000-4000-8000-000000000002", actor_user_id: null, action: "PHYSICAL_CARD_SHIP", target_table: "commerce_physical_card_units", target_id: "20000000-0000-4000-8000-000000000004", before_value: { status: "SHIPPING_PENDING" }, after_value: { status: "IN_TRANSIT", carrier: "Yurtiçi Kargo" }, created_at: ago(0, 8) },
      { id: "90000000-0000-4000-8000-000000000003", actor_user_id: null, action: "NETWORK_MAIL_ADJUSTED", target_table: "entitlements", target_id: users[0][0], before_value: { remaining: 72 }, after_value: { remaining: 82, delta: 10 }, created_at: ago(2) },
    ],
  };
}
