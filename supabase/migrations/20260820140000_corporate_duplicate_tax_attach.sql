-- Same-owner duplicate VKN on a second paid CORP order must attach the
-- buyer to the existing tenant instead of leaving a paid order with no panel.

alter table public.commerce_fulfillment_issues
  drop constraint if exists commerce_fulfillment_issues_issue_code_check;
alter table public.commerce_fulfillment_issues
  add constraint commerce_fulfillment_issues_issue_code_check
  check (issue_code in (
    'RENEWAL_ENTITLEMENT_MISSING',
    'BUSINESS_SUBSCRIPTION_MISSING',
    'INVALID_FULFILLMENT_METADATA',
    'AUTHENTICATED_CLAIM_FAILED',
    'PAID_ENTITLEMENT_MISSING',
    'CORPORATE_TENANT_FAILED',
    'CORPORATE_DUPLICATE_TAX'
  ));

create or replace function public.fulfill_paid_corporate_package_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.commerce_orders%rowtype;
  v_item public.commerce_order_items%rowtype;
  v_shipping public.shipping_addresses%rowtype;
  v_metadata jsonb;
  v_kind text;
  v_seats integer;
  v_plan text;
  v_org_id uuid;
  v_existing uuid;
  v_slug text;
  v_base_slug text;
  v_result jsonb;
  v_attempt integer;
  v_index integer;
  v_mail integer;
  v_expires timestamptz;
  v_failed integer := 0;
begin
  select * into v_order from public.commerce_orders where id = p_order_id for update;
  if not found or v_order.status <> 'PAID' then
    return jsonb_build_object('ok', false, 'code', 'ORDER_NOT_PAID');
  end if;

  select * into v_shipping from public.shipping_addresses where order_id = v_order.id;

  for v_item in
    select i.*
    from public.commerce_order_items i
    join public.product_variants pv on pv.id = i.variant_id
    where i.order_id = v_order.id
      and coalesce(pv.metadata->>'fulfillment_kind', '') = 'CORPORATE_PACKAGE'
  loop
    select coalesce(pv.metadata, '{}'::jsonb) into v_metadata
    from public.product_variants pv where pv.id = v_item.variant_id;
    v_kind := coalesce(v_metadata->>'fulfillment_kind', '');
    v_seats := greatest(coalesce(nullif(v_metadata->>'seat_count', '')::integer, 0), 0);
    v_plan := nullif(v_metadata->>'package_code', '');
    v_mail := greatest(coalesce(nullif(v_metadata->>'network_mail_credits', '')::integer, public.network_mail_grant(v_seats)), 0);
    v_org_id := nullif(v_item.configuration->>'organizationId', '')::uuid;

    if v_seats <= 0 or v_seats > 100 or v_plan is null then
      perform public.record_commerce_fulfillment_issue(
        v_order.id, v_item.id, 'INVALID_FULFILLMENT_METADATA',
        jsonb_build_object('sku', v_item.configuration->>'sku', 'seats', v_seats, 'plan', v_plan)
      );
      v_failed := v_failed + 1;
      continue;
    end if;

    if v_org_id is not null then
      select id into v_existing from public.organizations where id = v_org_id;
      if found then
        update public.organization_members
        set user_id = coalesce(user_id, v_order.user_id),
            status = case when coalesce(user_id, v_order.user_id) is not null then 'ACTIVE' else status end,
            full_name = coalesce(nullif(full_name, ''), v_order.customer_name)
        where organization_id = v_org_id
          and lower(email) = lower(v_order.guest_email);

        if not found then
          insert into public.organization_members (organization_id, email, full_name, role, status, user_id)
          values (
            v_org_id,
            lower(v_order.guest_email),
            v_order.customer_name,
            'OWNER',
            case when v_order.user_id is null then 'INVITED' else 'ACTIVE' end,
            v_order.user_id
          )
          on conflict (organization_id, email) do nothing;
        end if;

        for v_index in 1..v_seats loop
          insert into public.commerce_physical_card_units(order_item_id, instance_no, purpose, organization_id)
          values (v_item.id, v_index, 'BUSINESS_INITIAL', v_org_id)
          on conflict (order_item_id, instance_no) do update
            set organization_id = excluded.organization_id;
        end loop;
        continue;
      end if;
    end if;

    if coalesce(nullif(trim(v_order.company_name), ''), '') = '' or coalesce(nullif(trim(v_order.tax_number), ''), '') = '' then
      perform public.record_commerce_fulfillment_issue(
        v_order.id, v_item.id, 'CORPORATE_TENANT_FAILED',
        jsonb_build_object('reason', 'MISSING_COMPANY_BILLING')
      );
      v_failed := v_failed + 1;
      continue;
    end if;

    v_base_slug := regexp_replace(
      lower(translate(trim(v_order.company_name), 'İIıĞğÜüŞşÖöÇç', 'iiigguussoocc')),
      '[^a-z0-9]+', '-', 'g'
    );
    v_base_slug := trim(both '-' from v_base_slug);
    if length(v_base_slug) < 3 then v_base_slug := 'sirket'; end if;
    v_expires := now() + interval '365 days';
    v_result := null;

    for v_attempt in 0..4 loop
      v_slug := case when v_attempt = 0 then v_base_slug else v_base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6) end;
      v_result := public.create_organization_tenant(
        v_order.user_id,
        trim(v_order.company_name),
        v_slug,
        trim(v_order.tax_number),
        coalesce(nullif(trim(v_order.tax_office), ''), ''),
        coalesce(v_shipping.address_line, ''),
        coalesce(v_shipping.city, ''),
        coalesce(v_shipping.district, ''),
        'Türkiye',
        v_seats,
        v_seats,
        v_seats,
        v_mail,
        10737418240::bigint,
        'ACTIVE',
        v_plan,
        'YEARLY',
        v_expires
      );
      if coalesce((v_result->>'ok')::boolean, false) then
        exit;
      end if;
      if v_result->>'code' = 'DUPLICATE_SLUG_OR_MEMBER' and v_attempt < 4 then
        continue;
      end if;
      exit;
    end loop;

    if not coalesce((v_result->>'ok')::boolean, false) then
      select o.id into v_existing
      from public.organizations o
      where o.tax_number = trim(v_order.tax_number)
      limit 1;
      if v_result->>'code' = 'DUPLICATE_TAX_NUMBER'
        and v_existing is not null
        and exists (
          select 1
          from public.organization_members m
          where m.organization_id = v_existing
            and m.role = 'OWNER'
            and lower(m.email) = lower(v_order.guest_email)
        ) then
        v_org_id := v_existing;
        perform public.record_commerce_fulfillment_issue(
          v_order.id, v_item.id, 'CORPORATE_DUPLICATE_TAX',
          jsonb_build_object('reason', 'SAME_OWNER_RETRY', 'organization_id', v_org_id, 'plan', v_plan)
        );
        v_failed := v_failed + 1;
      else
        perform public.record_commerce_fulfillment_issue(
          v_order.id, v_item.id, 'CORPORATE_TENANT_FAILED',
          jsonb_build_object('reason', coalesce(v_result->>'code', 'TENANT_CREATE_FAILED'), 'plan', v_plan)
        );
        v_failed := v_failed + 1;
        continue;
      end if;
    end if;

    if coalesce((v_result->>'ok')::boolean, false) then
      v_org_id := (v_result->'organization'->>'id')::uuid;
    end if;

    insert into public.organization_members (organization_id, email, full_name, role, status, user_id)
    values (
      v_org_id,
      lower(v_order.guest_email),
      v_order.customer_name,
      'OWNER',
      case when v_order.user_id is null then 'INVITED' else 'ACTIVE' end,
      v_order.user_id
    )
    on conflict (organization_id, email) do update
      set user_id = coalesce(public.organization_members.user_id, excluded.user_id),
          status = case when coalesce(excluded.user_id, public.organization_members.user_id) is not null then 'ACTIVE' else public.organization_members.status end,
          full_name = coalesce(nullif(public.organization_members.full_name, ''), excluded.full_name);

    update public.commerce_order_items
    set configuration = coalesce(configuration, '{}'::jsonb) || jsonb_build_object(
      'organizationId', v_org_id,
      'seatCount', v_seats,
      'packageCode', v_plan,
      'companyName', trim(v_order.company_name),
      'taxNumber', trim(v_order.tax_number),
      'taxOffice', trim(v_order.tax_office)
    )
    where id = v_item.id;

    for v_index in 1..v_seats loop
      insert into public.commerce_physical_card_units(order_item_id, instance_no, purpose, organization_id)
      values (v_item.id, v_index, 'BUSINESS_INITIAL', v_org_id)
      on conflict (order_item_id, instance_no) do update
        set organization_id = excluded.organization_id;
    end loop;

    insert into public.admin_audit_log(actor_user_id, action, target_table, target_id, after_value)
    values (
      v_order.user_id,
      'CORPORATE_PACKAGE_FULFILLED',
      'organizations',
      v_org_id::text,
      jsonb_build_object('order_id', v_order.id, 'order_item_id', v_item.id, 'plan', v_plan, 'seats', v_seats)
    );

    update public.commerce_fulfillment_issues
    set resolved_at = coalesce(resolved_at, now()),
        resolution_note = coalesce(resolution_note, 'Kurumsal paket tenant kurulumu tamamlandı.'),
        updated_at = now()
    where order_id = v_order.id
      and order_item_id = v_item.id
      and resolved_at is null
      and issue_code in ('CORPORATE_TENANT_FAILED', 'INVALID_FULFILLMENT_METADATA');
  end loop;

  return jsonb_build_object('ok', v_failed = 0, 'failed', v_failed, 'order_id', p_order_id);
end;
$$;

revoke all on function public.fulfill_paid_corporate_package_order(uuid) from public, anon, authenticated;
grant execute on function public.fulfill_paid_corporate_package_order(uuid) to service_role;

