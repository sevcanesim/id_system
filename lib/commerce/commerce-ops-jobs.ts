import { abandonedEventType, classifyAbandonedWave } from "./abandoned-checkout";
import { sendAbandonedCheckoutEmail, sendOpsFulfillmentAlertEmail } from "../email/resend";
import { publicSiteUrl } from "../payments/config";
import { getSupabaseAdminClient } from "../supabase/server-admin";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const ABANDONED_BATCH = 40;

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

export async function runPaidOrderReconciliation(admin: AdminClient) {
  const { data, error } = await admin.rpc("reconcile_paid_commerce_orders", { p_limit: 250 });
  if (error) throw error;
  return data ?? { ok: true };
}

export async function expireStaleAwaitingOrders(admin: AdminClient) {
  const { data, error } = await admin.rpc("expire_stale_awaiting_payment_orders", { p_limit: 250 });
  if (error) throw error;
  return data ?? { ok: true };
}

export async function sendAbandonedCheckoutReminders(admin: AdminClient, now = Date.now()) {
  const since = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const until = new Date(now - TWO_HOURS_MS).toISOString();
  const { data: orders, error: orderError } = await admin
    .from("commerce_orders")
    .select("id,order_number,guest_email,created_at")
    .eq("status", "AWAITING_PAYMENT")
    .not("guest_email", "is", null)
    .gte("created_at", since)
    .lte("created_at", until)
    .order("created_at", { ascending: true })
    .limit(200);
  if (orderError) throw orderError;
  if (!orders?.length) return { scanned: 0, sent: 0, skipped: 0 };

  const ids = orders.map((order) => order.id);
  const [{ data: attempts, error: attemptError }, { data: events, error: eventError }] = await Promise.all([
    admin.from("commerce_payment_attempts").select("order_id,status,updated_at").in("order_id", ids),
    admin.from("commerce_email_events").select("order_id,event_type").in("order_id", ids).in("event_type", ["ABANDONED_CHECKOUT", "ABANDONED_CHECKOUT_24H"]),
  ]);
  if (attemptError) throw attemptError;
  if (eventError) throw eventError;

  const recentPending = new Set(
    (attempts ?? [])
      .filter((attempt) => attempt.status === "PENDING" && now - new Date(attempt.updated_at).getTime() < TWO_HOURS_MS)
      .map((attempt) => attempt.order_id),
  );
  const sent = new Set((events ?? []).map((event) => `${event.order_id}:${event.event_type}`));

  let mailed = 0;
  let skipped = 0;
  for (const order of orders) {
    if (mailed >= ABANDONED_BATCH) break;
    const wave = classifyAbandonedWave({
      createdAt: order.created_at,
      now,
      hasRecentPendingAttempt: recentPending.has(order.id),
      sentFirst: sent.has(`${order.id}:ABANDONED_CHECKOUT`),
      sentDay: sent.has(`${order.id}:ABANDONED_CHECKOUT_24H`),
    });
    if (!wave || !order.guest_email) {
      skipped += 1;
      continue;
    }
    const eventType = abandonedEventType(wave);
    const mail = await sendAbandonedCheckoutEmail({
      to: order.guest_email,
      orderNumber: order.order_number,
      checkoutUrl: `${publicSiteUrl}/checkout`,
      wave,
    });
    if (!mail.sent) {
      skipped += 1;
      continue;
    }
    await admin.from("commerce_email_events").insert({
      order_id: order.id,
      event_type: eventType,
      recipient: order.guest_email,
      status: "SENT",
      provider_message: null,
    });
    mailed += 1;
  }

  return { scanned: orders.length, sent: mailed, skipped };
}

export async function notifyOpenFulfillmentIssues(admin: AdminClient, now = Date.now()) {
  const { data: issues, error } = await admin
    .from("commerce_fulfillment_issues")
    .select("id,order_id,issue_code,created_at,resolved_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  if (!issues?.length) return { open: 0, alerted: 0, escalated: 0 };

  const orderIds = [...new Set(issues.map((issue) => issue.order_id))];
  const [{ data: events, error: eventError }, { data: orders, error: orderError }] = await Promise.all([
    admin.from("commerce_email_events").select("order_id,event_type").in("order_id", orderIds).in("event_type", ["FULFILLMENT_ISSUE_ALERT", "FULFILLMENT_ISSUE_ESCALATION"]),
    admin.from("commerce_orders").select("id,order_number").in("id", orderIds),
  ]);
  if (eventError) throw eventError;
  if (orderError) throw orderError;

  const sent = new Set((events ?? []).map((event) => `${event.order_id}:${event.event_type}`));
  const numbers = new Map((orders ?? []).map((order) => [order.id, order.order_number]));
  const fresh = issues.filter((issue) => !sent.has(`${issue.order_id}:FULFILLMENT_ISSUE_ALERT`));
  const stale = issues.filter((issue) =>
    now - new Date(issue.created_at).getTime() >= 24 * 60 * 60 * 1000
    && !sent.has(`${issue.order_id}:FULFILLMENT_ISSUE_ESCALATION`),
  );

  let alerted = 0;
  let escalated = 0;
  if (fresh.length) {
    const mail = await sendOpsFulfillmentAlertEmail({
      kind: "new",
      issues: fresh.slice(0, 20).map((issue) => ({
        orderNumber: numbers.get(issue.order_id) ?? issue.order_id,
        issueCode: issue.issue_code,
        createdAt: issue.created_at,
      })),
      openCount: issues.length,
    });
    if (mail.sent) {
      await insertIssueAlerts(admin, fresh, "FULFILLMENT_ISSUE_ALERT");
      alerted = fresh.length;
    }
  }
  if (stale.length) {
    const mail = await sendOpsFulfillmentAlertEmail({
      kind: "escalation",
      issues: stale.slice(0, 20).map((issue) => ({
        orderNumber: numbers.get(issue.order_id) ?? issue.order_id,
        issueCode: issue.issue_code,
        createdAt: issue.created_at,
      })),
      openCount: issues.length,
    });
    if (mail.sent) {
      await insertIssueAlerts(admin, stale, "FULFILLMENT_ISSUE_ESCALATION");
      escalated = stale.length;
    }
  }

  return { open: issues.length, alerted, escalated };
}

async function insertIssueAlerts(
  admin: AdminClient,
  issues: Array<{ order_id: string }>,
  eventType: "FULFILLMENT_ISSUE_ALERT" | "FULFILLMENT_ISSUE_ESCALATION",
) {
  const uniqueOrders = [...new Set(issues.map((issue) => issue.order_id))];
  await admin.from("commerce_email_events").insert(uniqueOrders.map((orderId) => ({
    order_id: orderId,
    event_type: eventType,
    recipient: process.env.OPS_ALERT_TO || process.env.CORPORATE_LEAD_TO || "hello@yenomilabs.com",
    status: "SENT",
    provider_message: null,
  })));
}

export async function runCommerceOpsJobs() {
  const admin = getSupabaseAdminClient();
  const abandoned = await sendAbandonedCheckoutReminders(admin);
  const expired = await expireStaleAwaitingOrders(admin);
  const reconciled = await runPaidOrderReconciliation(admin);
  const alerts = await notifyOpenFulfillmentIssues(admin);
  return { abandoned, expired, reconciled, alerts };
}
