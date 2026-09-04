-- The legal company identity is a tenant-wide source of truth established at
-- activation. It must not drift after invoices, cards, or employee records
-- have started referring to it.

update public.organizations
set legal_name = nullif(trim(name), '')
where nullif(trim(coalesce(legal_name, '')), '') is null
  and nullif(trim(coalesce(name, '')), '') is not null;

-- Corporate checkout creates the organization only after a paid activation.
-- Normalize the immutable legal snapshot before constraints are evaluated so
-- every newly provisioned tenant receives its legal name and tax-id type.
update public.organizations
set tax_id_type = case
  when tax_number ~ '^\d{10}$' then 'VKN'
  when tax_number ~ '^\d{11}$' then 'TCKN'
  else tax_id_type
end
where tax_id_type is null
  and tax_number ~ '^\d{10,11}$';

create or replace function public.set_organization_legal_identity_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name := nullif(regexp_replace(trim(coalesce(new.name, '')), '\s+', ' ', 'g'), '');
  new.legal_name := coalesce(
    nullif(regexp_replace(trim(coalesce(new.legal_name, '')), '\s+', ' ', 'g'), ''),
    new.name
  );
  new.tax_number := nullif(regexp_replace(coalesce(new.tax_number, ''), '\D', '', 'g'), '');
  new.tax_office := nullif(regexp_replace(trim(coalesce(new.tax_office, '')), '\s+', ' ', 'g'), '');

  if new.tax_id_type is null then
    new.tax_id_type := case char_length(coalesce(new.tax_number, ''))
      when 10 then 'VKN'
      when 11 then 'TCKN'
      else null
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_legal_identity_defaults on public.organizations;
create trigger organizations_legal_identity_defaults
  before insert on public.organizations
  for each row
  execute function public.set_organization_legal_identity_defaults();

create or replace function public.prevent_organization_legal_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.corporate_id is distinct from new.corporate_id
    or old.name is distinct from new.name
    or old.legal_name is distinct from new.legal_name
    or old.tax_id_type is distinct from new.tax_id_type
    or old.tax_number is distinct from new.tax_number
    or old.tax_office is distinct from new.tax_office
    or old.mersis_number is distinct from new.mersis_number
    or old.trade_registry_number is distinct from new.trade_registry_number
    or old.billing_address is distinct from new.billing_address
    or old.billing_city is distinct from new.billing_city
    or old.billing_district is distinct from new.billing_district
    or old.billing_postal_code is distinct from new.billing_postal_code
    or old.billing_country_code is distinct from new.billing_country_code
    or old.billing_email is distinct from new.billing_email
    or old.billing_phone is distinct from new.billing_phone
    or old.authorized_person_name is distinct from new.authorized_person_name then
    raise exception using
      errcode = '42501',
      message = 'Resmî şirket bilgileri değiştirilemez.',
      detail = 'Şirket unvanı, vergi bilgileri ve fatura profili aktivasyon kaydından gelir.';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_legal_identity_immutable on public.organizations;
create trigger organizations_legal_identity_immutable
  before update on public.organizations
  for each row
  execute function public.prevent_organization_legal_identity_change();
