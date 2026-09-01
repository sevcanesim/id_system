-- Canonical legal/billing profile for corporate organizations.
-- Current profile stays mutable on organizations; immutable order/invoice snapshots remain separate.

alter table public.organizations
  add column if not exists legal_name text,
  add column if not exists tax_id_type text,
  add column if not exists tax_number text,
  add column if not exists tax_office text,
  add column if not exists mersis_number text,
  add column if not exists trade_registry_number text,
  add column if not exists billing_address text,
  add column if not exists billing_city text,
  add column if not exists billing_district text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_country_code text not null default 'TR',
  add column if not exists billing_email text,
  add column if not exists billing_phone text,
  add column if not exists authorized_person_name text;

do $$ begin
  alter table public.organizations
    add constraint organizations_tax_id_type_check
    check (tax_id_type is null or tax_id_type in ('VKN','TCKN'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.organizations
    add constraint organizations_tax_number_check
    check (
      tax_number is null
      or (tax_id_type = 'VKN' and tax_number ~ '^[0-9]{10}$')
      or (tax_id_type = 'TCKN' and tax_number ~ '^[0-9]{11}$')
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.organizations
    add constraint organizations_billing_country_check
    check (billing_country_code = 'TR');
exception when duplicate_object then null;
end $$;

create unique index if not exists organizations_tax_number_uidx
  on public.organizations(tax_number)
  where tax_number is not null;

create index if not exists organizations_legal_name_idx
  on public.organizations(lower(coalesce(legal_name, name)));
