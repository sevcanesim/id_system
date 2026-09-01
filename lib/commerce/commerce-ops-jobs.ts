import { abandonedEventType, classifyAbandonedWave } from "./abandoned-checkout";
import { createCheckoutResumeToken } from "./checkout-resume";
import { sendAbandonedCheckoutEmail, sendOpsFulfillmentAlertEmail } from "../email/resend";
import { publicSiteUrl } from "../payments/config";
import { getSupabaseAdminClient } from "../supabase/server-admin";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const ABANDONED_BATCH = 40;

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

export async function runPaidOrderReconciliation(admin: AdminClient) {
  const { data: reconciliation, error } = await admin.rpc("reconcile_paid_commerce_orders", { p_limit: 250 });
  if (error) throw error;
  return reconciliation ?? { ok: true };
}

export async function expireStaleAwaitingOrders(admin: AdminClient) {
  const { data: expiry, error } = await admin.rpc("expire_stale_awaiting_payment_orders", { p_limit: 250 });
  if (error) throw error;
  return expiry ?? { ok: true };
}

export async function queueCorporateCapacityRenewals(admin: AdminClient, daysAhead = 30) {
  const { data, error } = await admin.rpc("queue_due_capacity_renewals", { p_days_ahead: daysAhead });
  if (error) throw error;
  return data ?? { ok: true, queued: 0 };
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

  const orderIds = orders.map((order) => order.id);
  const [
    { data: attempts, error: attemptError },
    { data: mailedEvents, error: eventError },
    { data: resumeSessions, error: resumeError },
  ] = await Promise.all([
    admin.from("commerce_payment_attempts").select("order_id,status,updated_at").in("order_id", orderIds),
    admin.from("commerce_email_events").select("order_id,event_type").in("order_id", orderIds).in("event_type", ["ABANDONED_CHECKOUT", "ABANDONED_CHECKOUT_24H"]),
    admin.from("commerce_checkout_sessions").select("order_id,expires_at").in("order_id", orderIds).gt("expires_at", new Date(now).toISOString()),
  ]);
  if (attemptError) throw attemptError;
  if (eventError) throw eventError;
  if (resumeError) throw resumeError;

  const recentPending = new Set(
    (attempts ?? [])
      .filter((attempt) => attempt.status === "PENDING" && now - new Date(attempt.updated_at).getTime() < TWO_HOURS_MS)
      .map((attempt) => attempt.order_id),
  );
  const mailedKeys = new Set((mailedEvents ?? []).map((event) => `${event.order_id}:${event.event_type}`));
  const resumeByOrder = new Map((resumeSessions ?? []).map((session) => [session.order_id, session.expires_at]));

  let mailed = 0;
  let skipped = 0;
  for (const order of orders) {
    if (mailed >= ABANDONED_BATCH) break;
    const wave = classifyAbandonedWave({
      createdAt: order.created_at,
      now,
      hasRecentPendingAttempt: recentPending.has(order.id),
      sentFirst: mailedKeys.has(`${order.id}:ABANDONED_CHECKOUT`),
      sentDay: mailedKeys.has(`${order.id}:ABANDONED_CHECKOUT_24H`),
    });
    if (!wave || !order.guest_email) {
      skipped += 1;
      continue;
    }

    const expiresAt = resumeByOrder.get(order.id);
    const resumeToken = expiresAt ? createCheckoutResumeToken(order.id, expiresAt) : null;
    const eventType = abandonedEventType(wave);
    const outbound = await sendAbandonedCheckoutEmail({
      to: order.guest_email,
      orderNumber: order.order_number,
      checkoutUrl: resumeToken
        ? `${publicSiteUrl}/checkout?resume=${encodeURIComponent(resumeToken)}`
        : `${publicSiteUrl}/checkout`,
      wave,
    });
    if (!outbound.sent) {
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
  const { data: openIssues, error: openIssuesError } = await admin
    .from("commerce_fulfillment_issues")
    .select("id,order_id,issue_code,created_at,resolved_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (openIssuesError) throw openIssuesError;
  if (!openIssues?.length) return { open: 0, alerted: 0, escalated: 0 };

  const orderIds = [...new Set(openIssues.map((issue) => issue.order_id))];
  const [{ data: mailedEvents, error: eventError }, { data: relatedOrders, error: orderError }] = await Promise.all([
    admin.from("commerce_email_events").select("order_id,event_type").in("order_id", orderIds).in("event_type", ["FULFILLMENT_ISSUE_ALERT", "FULFILLMENT_ISSUE_ESCALATION"]),
    admin.from("commerce_orders").select("id,order_number").in("id", orderIds),
  ]);
  if (eventError) throw eventError;
  if (orderError) throw orderError;

  const mailedKeys = new Set((mailedEvents ?? []).map((event) => `${event.order_id}:${event.event_type}`));
  const orderNumbers = new Map((relatedOrders ?? []).map((order) => [order.id, order.order_number]));
  const freshIssues = openIssues.filter((issue) => !mailedKeys.has(`${issue.order_id}:FULFILLMENT_ISSUE_ALERT`));
  const staleIssues = openIssues.filter((issue) =>
    now - new Date(issue.created_at).getTime() >= 24 * 60 * 60 * 1000
    && !mailedKeys.has(`${issue.order_id}:FULFILLMENT_ISSUE_ESCALATION`),
  );

  let alerted = 0;
  let escalated = 0;
  if (freshIssues.length) {
    const freshNotice = await sendOpsFulfillmentAlertEmail({
      kind: "new",
      issues: freshIssues.slice(0, 20).map((issue) => ({
        orderNumber: orderNumbers.get(issue.order_id) ?? issue.order_id,
        issueCode: issue.issue_code,
        createdAt: issue.created_at,
      })),
      openCount: openIssues.length,
    });
    if (freshNotice.sent) {
      await insertIssueAlerts(admin, freshIssues, "FULFILLMENT_ISSUE_ALERT");
      alerted = freshIssues.length;
    }
  }
  if (staleIssues.length) {
    const escalationNotice = await sendOpsFulfillmentAlertEmail({
      kind: "escalation",
      issues: staleIssues.slice(0, 20).map((issue) => ({
        orderNumber: orderNumbers.get(issue.order_id) ?? issue.order_id,
        issueCode: issue.issue_code,
        createdAt: issue.created_at,
      })),
      openCount: openIssues.length,
    });
    if (escalationNotice.sent) {
      await insertIssueAlerts(admin, staleIssues, "FULFILLMENT_ISSUE_ESCALATION");
      escalated = staleIssues.length;
    }
  }

  return { open: openIssues.length, alerted, escalated };
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
  const renewals = await queueCorporateCapacityRenewals(admin);
  const alerts = await notifyOpenFulfillmentIssues(admin);
  return { abandoned, expired, reconciled, renewals, alerts };
}
