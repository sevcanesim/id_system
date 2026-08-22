-- P0: Data API roles must not inherit DML/EXECUTE on every future public object.
-- 20260819160000 granted table DML + routine execute (and default privileges)
-- to anon/authenticated so PostgREST + RLS can reach existing product tables.
-- That default is the "forgot RLS on a new table" hole. Revoke it.
-- Existing table grants for PostgREST-backed product tables stay; new objects
-- need an explicit GRANT after RLS or RPC policy.

alter default privileges in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges in schema public
  revoke usage, select on sequences from anon, authenticated;
alter default privileges in schema public
  revoke execute on routines from anon, authenticated;

-- Backend-only tables: provider tokens, activation secrets, mail, audit, leads.
-- Admin UI goes through service_role API routes, not PostgREST.
revoke all on table public.commerce_payment_attempts from anon, authenticated, public;
revoke all on table public.payment_attempts from anon, authenticated, public;
revoke all on table public.activation_tokens from anon, authenticated, public;
revoke all on table public.commerce_email_events from anon, authenticated, public;
revoke all on table public.admin_audit_log from anon, authenticated, public;
revoke all on table public.corporate_leads from anon, authenticated, public;

grant all on table public.commerce_payment_attempts to service_role;
grant all on table public.payment_attempts to service_role;
grant all on table public.activation_tokens to service_role;
grant all on table public.commerce_email_events to service_role;
grant all on table public.admin_audit_log to service_role;
grant all on table public.corporate_leads to service_role;
