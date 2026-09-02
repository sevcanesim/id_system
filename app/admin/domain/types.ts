// app/admin/page.tsx'ten çıkarıldı — Satış Kuyruğu dışındaki sekmelerin
// (Ödeme Mutabakatı, Kurumsal Hesaplar) domain tipleri. Sipariş tipleri
// (Order, OrderItem, Status vb.) lib/admin/order-classification.ts'te.

export type BusinessPlan = { code: string; name: string; seat_limit: number | null; annual_price_kurus: number | null; monthly_price_kurus: number | null; is_active: boolean };
export type ReconciliationIssue = { id: string; order_id: string; order_item_id: string | null; issue_code: string; details: Record<string, unknown>; resolved_at: string | null; resolution_note: string | null; created_at: string };
export type ReconciliationRow = {
  id: string; order_number: string; status: string; total_kurus: number; currency: string; guest_email: string; paid_at: string | null; created_at: string; activation_claimed_at: string | null; user_id: string | null; openIssueCount: number; flags: string[]; requiresReview: boolean;
  paymentAttempts: { id: string; status: string; provider_payment_id: string | null; error_code: string | null; error_message: string | null; updated_at: string }[];
  fulfillmentIssues: ReconciliationIssue[];
};
export type ReconciliationSummary = { checkedOrders: number; requiresReview: number; openFulfillmentIssues: number; orphanPaidAttempts: number };
export type CorporateAccount = {
  id: string; name: string; slug: string; status: string; createdAt: string; corporateId: string | null; taxNumber: string | null;
  subscription: { id: string; status: string; seat_limit: number; starts_at: string | null; expires_at: string | null; billing_period: "MONTHLY" | "YEARLY"; business_plans: { code: string; name: string } | null } | null;
  entitlements: { employee_limit: number; digital_card_limit: number; physical_card_limit: number; mail_credit_limit: number; mail_credits_remaining: number } | null;
  usedSeats: number; memberCount: number; managers: { id: string; role: string; status: string; email: string }[];
};
export type CorporateForm = { name: string; taxNumber: string; taxOffice: string; legalAddress: string; city: string; planCode: string; employeeLimit: string; digitalCardLimit: string; physicalCardLimit: string; mailCreditLimit: string; billingPeriod: "MONTHLY" | "YEARLY"; termDays: string; status: "ACTIVE" | "SUSPENDED" };
export type AttachManagerForm = { email: string; fullName: string; role: "OWNER" | "ADMIN" | "HR" };
