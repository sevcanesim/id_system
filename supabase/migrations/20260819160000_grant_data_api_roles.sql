-- Fresh local/hosted databases create public tables as `postgres` without
-- automatic GRANTs to Data API roles. RLS remains the authorization layer;
-- without these grants PostgREST returns 403/empty errors for service_role
-- and authenticated clients cannot read `user_accounts` during login.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all routines in schema public to anon, authenticated;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public grant execute on routines to anon, authenticated;
