alter table public.organizations
  add constraint organizations_future_corporate_vkn_check
  check (
    tax_number is null
    or (tax_id_type = 'VKN' and tax_number ~ '^[0-9]{10}$')
  ) not valid;
