-- Commerce ops: abandoned-checkout and fulfillment-alert email vocabulary.
-- Existing event types stay valid; new types are used by the Vercel cron job.

alter table public.commerce_email_events
  drop constraint if exists commerce_email_events_event_type_check;

alter table public.commerce_email_events
  add constraint commerce_email_events_event_type_check
    check (event_type in (
      'ACTIVATION',
      'ACTIVATION_RESEND',
      'SHIPPING',
      'RENEWAL',
      'ORDER_READY',
      'ORDER_REVIEW_REQUIRED',
      'ABANDONED_CHECKOUT',
      'ABANDONED_CHECKOUT_24H',
      'FULFILLMENT_ISSUE_ALERT',
      'FULFILLMENT_ISSUE_ESCALATION'
    ));
