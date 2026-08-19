-- Fix DELETE version capture: an AFTER DELETE trigger cannot insert the deleted
-- organization_links.id back into organization_link_versions because the FK target
-- no longer exists. Keep the historical snapshot, but detach it from the removed row.

create or replace function public.capture_organization_link_version()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  snapshot public.organization_links%rowtype;
  reason text;
begin
  if tg_op = 'INSERT' then
    snapshot := new;
    reason := 'CREATE';
  elsif tg_op = 'DELETE' then
    snapshot := old;
    reason := 'DELETE';
  else
    snapshot := old;
    reason := case when current_setting('app.organization_link_rollback', true) = 'true' then 'ROLLBACK' else 'UPDATE' end;
  end if;

  insert into public.organization_link_versions(
    organization_link_id,organization_id,kind,label,subtitle,link_type,url,
    file_path,file_name,file_size,is_published,publish_at,changed_by,change_reason
  ) values(
    case when tg_op = 'DELETE' then null else snapshot.id end,
    snapshot.organization_id,snapshot.kind,snapshot.label,snapshot.subtitle,
    snapshot.link_type,snapshot.url,snapshot.file_path,snapshot.file_name,snapshot.file_size,
    snapshot.is_published,snapshot.publish_at,snapshot.updated_by,reason
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
