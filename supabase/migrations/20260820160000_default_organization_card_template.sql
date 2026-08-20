-- Default corporate card template: company name locked, title locked,
-- personal name/email suggested. First OWNER card inherits policy without
-- waiting for Ayarlar. Also backfill tenants created before this seed.

create or replace function public.seed_default_organization_card_template()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.organization_card_templates
    where organization_id = new.id and is_default = true
  ) then
    return new;
  end if;
  insert into public.organization_card_templates (organization_id, name, is_default, fields)
  values (
    new.id,
    'Varsayılan kurumsal kart',
    true,
    jsonb_build_object(
      'lockCompany', 'locked',
      'lockTitle', 'locked',
      'lockName', 'suggested',
      'lockEmail', 'suggested',
      'lockPhone', 'free'
    )
  );
  return new;
end;
$$;

drop trigger if exists organizations_seed_default_card_template on public.organizations;
create trigger organizations_seed_default_card_template
after insert on public.organizations
for each row execute function public.seed_default_organization_card_template();

revoke all on function public.seed_default_organization_card_template() from public, anon, authenticated;
grant execute on function public.seed_default_organization_card_template() to service_role;

insert into public.organization_card_templates (organization_id, name, is_default, fields)
select
  o.id,
  'Varsayılan kurumsal kart',
  true,
  jsonb_build_object(
    'lockCompany', 'locked',
    'lockTitle', 'locked',
    'lockName', 'suggested',
    'lockEmail', 'suggested',
    'lockPhone', 'free'
  )
from public.organizations o
where not exists (
  select 1 from public.organization_card_templates t
  where t.organization_id = o.id and t.is_default = true
);
