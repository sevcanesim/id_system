-- Live CORP-2…CORP-100 checkout SKUs, company billing on the order, and
-- paid-order tenant provisioning. Enterprise / >100 seats stays quote-only.

alter table public.commerce_orders
  add column if not exists company_name text,
  add column if not exists tax_number text,
  add column if not exists tax_office text;

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
    'CORPORATE_TENANT_FAILED'
  ));

insert into public.products(slug, name, kind, description, is_active)
values (
  'yenomi-business',
  'Yenomi ID Kurumsal Paket',
  'BUSINESS_CARD',
  'Yıllık kurumsal sistem: NFC kart, çalışan profilleri, şirket paneli ve Network Mail.',
  true
)
on conflict (slug) do update
set name = excluded.name,
    kind = excluded.kind,
    description = excluded.description,
    is_active = true;

insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata, is_active)
select p.id, v.sku, v.name, v.price_kurus, 'YEARLY', meta.metadata, true
from public.products p
cross join (values
  ('YENOMI-CORP-2', 'Kurumsal 2', 240000, 2, 'CORP-2'),
  ('YENOMI-CORP-3', 'Kurumsal 3', 350000, 3, 'CORP-3'),
  ('YENOMI-CORP-4', 'Kurumsal 4', 450000, 4, 'CORP-4'),
  ('YENOMI-CORP-5', 'Kurumsal 5', 550000, 5, 'CORP-5'),
  ('YENOMI-CORP-10', 'Kurumsal 10', 990000, 10, 'CORP-10'),
  ('YENOMI-CORP-20', 'Kurumsal 20', 1890000, 20, 'CORP-20'),
  ('YENOMI-CORP-25', 'Kurumsal 25', 2290000, 25, 'CORP-25'),
  ('YENOMI-CORP-50', 'Kurumsal 50', 3990000, 50, 'CORP-50'),
  ('YENOMI-CORP-75', 'Kurumsal 75', 5690000, 75, 'CORP-75'),
  ('YENOMI-CORP-100', 'Kurumsal 100', 6990000, 100, 'CORP-100')
) as v(sku, name, price_kurus, seats, package_code)
cross join lateral (
  select jsonb_build_object(
    'fulfillment_kind', 'CORPORATE_PACKAGE',
    'digital_service_included', true,
    'physical_card_count', v.seats,
    'seat_count', v.seats,
    'service_days', 365,
    'shipping_included', true,
    'country', 'TR',
    'preparation_business_days', 2,
    'package_code', v.package_code,
    'network_mail_credits', v.seats * 100
  ) as metadata
) meta
where p.slug = 'yenomi-business'
on conflict (sku) do update set
  name = excluded.name,
  price_kurus = excluded.price_kurus,
  billing_period = excluded.billing_period,
  metadata = excluded.metadata,
  is_active = true,
  product_id = excluded.product_id;

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
      perform public.record_commerce_fulfillment_issue(
        v_order.id, v_item.id, 'CORPORATE_TENANT_FAILED',
        jsonb_build_object('reason', coalesce(v_result->>'code', 'TENANT_CREATE_FAILED'), 'plan', v_plan)
      );
      v_failed := v_failed + 1;
      continue;
    end if;

    v_org_id := (v_result->'organization'->>'id')::uuid;

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

create or replace function public.route_commerce_fulfillment()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_item public.commerce_order_items%rowtype;
  v_sku text;
  v_kind text;
  v_metadata jsonb;
  v_org_id uuid;
  v_card_count integer;
  v_index integer;
  v_user_id uuid;
  v_existing public.entitlements%rowtype;
  v_new_expiry timestamptz;
  v_grant integer;
  v_package text;
begin
  select i.* into v_item from public.commerce_order_items i where i.id=new.order_item_id;
  if not found then return new; end if;

  select pv.sku,
         coalesce(pv.metadata->>'fulfillment_kind',
           case when pv.sku='YENOMI-NFC-EXTRA' then 'EXTRA_CARD'
                when pv.sku like 'YENOMI-BUSINESS-SEATS-%' then 'BUSINESS_CAPACITY_ADDON'
                when pv.sku like 'YENOMI-CORP-%' then 'CORPORATE_PACKAGE'
                else 'INITIAL_BUNDLE' end),
         coalesce(pv.metadata, '{}'::jsonb)
  into v_sku, v_kind, v_metadata
  from public.product_variants pv where pv.id=v_item.variant_id;
  if not found then return new; end if;

  v_grant := greatest(coalesce(nullif(v_metadata->>'network_mail_credits','')::integer, 0), 0);
  v_package := nullif(v_metadata->>'package_code','');

  if v_kind in ('DIGITAL_RENEWAL', 'PREMIUM_UPGRADE') then
    select o.user_id into v_user_id from public.commerce_orders o where o.id=v_item.order_id;
    select e.* into v_existing
      from public.entitlements e
      where e.user_id=v_user_id
        and e.status in ('ACTIVE','EXPIRED')
        and e.kind in ('NFC_PHYSICAL_CARD','BUSINESS_CARD')
      order by e.expires_at desc nulls last
      limit 1 for update;

    if not found then
      perform public.record_commerce_fulfillment_issue(
        v_item.order_id, v_item.id, 'RENEWAL_ENTITLEMENT_MISSING',
        jsonb_build_object('user_id', v_user_id, 'sku', v_sku, 'fulfillment_kind', v_kind)
      );
      return null;
    end if;

    if v_kind = 'DIGITAL_RENEWAL' then
      v_new_expiry := greatest(coalesce(v_existing.expires_at, now()), now()) + interval '365 days';
      update public.entitlements
      set status='ACTIVE',
          expires_at=v_new_expiry,
          grace_ends_at=v_new_expiry + interval '7 days',
          updated_at=now()
      where id=v_existing.id;

      if v_sku = 'YENOMI-PREMIUM-RENEWAL-ANNUAL' then
        update public.entitlements
        set package_code = 'INDIVIDUAL_PREMIUM'
        where id = v_existing.id;
        perform public.apply_individual_network_mail(v_existing.id, 'ROLLOVER', v_grant);
      else
        update public.entitlements
        set package_code = 'INDIVIDUAL'
        where id = v_existing.id;
        perform public.apply_individual_network_mail(v_existing.id, 'EXPIRE', 0);
      end if;
      return null;
    end if;

    update public.entitlements
    set package_code = coalesce(v_package, 'INDIVIDUAL_PREMIUM'),
        status = 'ACTIVE',
        updated_at = now()
    where id = v_existing.id;
    perform public.apply_individual_network_mail(v_existing.id, 'GRANT', v_grant);
    return null;
  end if;

  v_org_id:=nullif(v_item.configuration->>'organizationId','')::uuid;

  if v_kind='CORPORATE_PACKAGE' then
    v_card_count:=greatest(coalesce(nullif(v_metadata->>'seat_count','')::integer, 0), 0);
    if v_card_count <= 0 then
      perform public.record_commerce_fulfillment_issue(
        v_item.order_id, v_item.id, 'INVALID_FULFILLMENT_METADATA',
        jsonb_build_object('sku', v_sku, 'fulfillment_kind', v_kind)
      );
      return null;
    end if;
    for v_index in 1..v_card_count loop
      insert into public.commerce_physical_card_units(order_item_id, instance_no, purpose, organization_id)
      values (v_item.id, ((new.instance_no-1)*v_card_count)+v_index, 'BUSINESS_INITIAL', v_org_id)
      on conflict(order_item_id, instance_no) do nothing;
    end loop;
    return null;
  end if;

  if v_kind='BUSINESS_CAPACITY_ADDON' then
    v_card_count:=coalesce(nullif(v_item.configuration->>'seatCount','')::integer,0);
    if v_org_id is null or v_card_count <= 0 then
      perform public.record_commerce_fulfillment_issue(
        v_item.order_id,v_item.id,'INVALID_FULFILLMENT_METADATA',
        jsonb_build_object('organization_id',v_org_id,'seat_count',v_card_count,'sku',v_sku)
      );
      return null;
    end if;
    for v_index in 1..v_card_count loop
      insert into public.commerce_physical_card_units(order_item_id,instance_no,purpose,organization_id)
      values(v_item.id,((new.instance_no-1)*v_card_count)+v_index,'BUSINESS_CAPACITY_ADDON',v_org_id)
      on conflict(order_item_id,instance_no) do nothing;
    end loop;
    return null;
  end if;

  insert into public.commerce_physical_card_units(order_item_id,instance_no,purpose,organization_id)
  values(
    v_item.id,new.instance_no,
    case when v_kind='EXTRA_CARD' then 'EXTRA_CARD'
         when v_kind='REPLACEMENT_CARD' then 'REPLACEMENT_CARD'
         when v_kind='BUSINESS_INITIAL' then 'BUSINESS_INITIAL'
         else 'INITIAL_BUNDLE' end,
    v_org_id
  ) on conflict(order_item_id,instance_no) do nothing;

  if v_kind in ('EXTRA_CARD','REPLACEMENT_CARD') then return null; end if;

  if v_kind = 'INITIAL_BUNDLE' then
    new.package_code := coalesce(v_package, 'INDIVIDUAL');
    if v_grant > 0 then
      new.network_mail_limit := v_grant;
      new.network_mail_remaining := v_grant;
    else
      new.network_mail_limit := coalesce(new.network_mail_limit, 0);
      new.network_mail_remaining := coalesce(new.network_mail_remaining, 0);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.route_commerce_fulfillment() from public,anon,authenticated;
grant execute on function public.route_commerce_fulfillment() to service_role;

create or replace function public.process_commerce_payment_callback(
  p_attempt_id uuid,
  p_paid boolean,
  p_provider_payment_id text,
  p_error_code text,
  p_error_message text,
  p_raw_result jsonb,
  p_activation_token_hash text,
  p_activation_expires_at timestamptz
)
returns table(outcome text,order_id uuid,order_number text,guest_email text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_attempt public.commerce_payment_attempts%rowtype;
  v_order public.commerce_orders%rowtype;
  v_paid_at timestamptz:=now();
  v_seat_item record;
  v_subscription public.organization_subscriptions%rowtype;
  v_org_id uuid;
  v_seats integer;
  v_open_issues integer:=0;
begin
  select * into v_attempt from public.commerce_payment_attempts where id=p_attempt_id for update;
  if not found then return query select 'ATTEMPT_NOT_FOUND'::text,null::uuid,null::text,null::text; return; end if;

  select * into v_order from public.commerce_orders where id=v_attempt.order_id for update;
  if v_attempt.status='PAID' or v_order.status='PAID' then
    perform public.fulfill_paid_corporate_package_order(v_order.id);
    select count(*) into v_open_issues from public.commerce_fulfillment_issues f where f.order_id=v_order.id and f.resolved_at is null;
    return query select case when v_open_issues>0 then 'PAID_REVIEW_REQUIRED' else 'ALREADY_PAID' end,
      v_order.id,v_order.order_number,v_order.guest_email;
    return;
  end if;

  if not p_paid then
    update public.commerce_payment_attempts set status='FAILED',provider_payment_id=coalesce(p_provider_payment_id,provider_payment_id),
      error_code=coalesce(p_error_code,'PAYMENT_VERIFICATION_FAILED'),error_message=coalesce(p_error_message,'Ödeme doğrulanamadı.'),
      raw_result=p_raw_result,updated_at=now() where id=v_attempt.id;
    update public.commerce_orders set status='AWAITING_PAYMENT' where id=v_order.id and status<>'PAID';
    insert into public.commerce_order_status_history(order_id,from_status,to_status,source,note)
      values(v_order.id,v_order.status,'AWAITING_PAYMENT','PAYMENT','Ödeme doğrulanamadı');
    return query select 'FAILED'::text,v_order.id,v_order.order_number,v_order.guest_email; return;
  end if;

  update public.commerce_payment_attempts set status='PAID',provider_payment_id=coalesce(p_provider_payment_id,provider_payment_id),
    error_code=null,error_message=null,raw_result=p_raw_result,updated_at=now() where id=v_attempt.id;
  update public.commerce_orders set status='PAID',paid_at=v_paid_at,activation_deadline_at=v_paid_at+interval '30 days' where id=v_order.id;
  insert into public.commerce_order_status_history(order_id,from_status,to_status,source,note)
    values(v_order.id,v_order.status,'PAID','PAYMENT','iyzico ödeme doğrulandı');

  insert into public.entitlements(order_item_id,instance_no,kind,status)
  select item.id,generated.instance_no,item.product_kind,'PENDING_ACTIVATION'
  from public.commerce_order_items item
  left join public.product_variants pv on pv.id=item.variant_id
  cross join lateral generate_series(1,greatest(item.quantity,1)) generated(instance_no)
  where item.order_id=v_order.id
    and coalesce(pv.metadata->>'fulfillment_kind','') not in ('CORPORATE_PACKAGE')
  on conflict(order_item_id,instance_no) do nothing;

  insert into public.activation_tokens(order_id,token_hash,expires_at)
  values(v_order.id,p_activation_token_hash,p_activation_expires_at);

  for v_seat_item in
    select item.id as order_item_id,item.quantity,
      nullif(item.configuration->>'organizationId','')::uuid as organization_id,
      coalesce(nullif(item.configuration->>'seatCount','')::integer,0) as seat_count
    from public.commerce_order_items item
    join public.product_variants pv on pv.id=item.variant_id
    where item.order_id=v_order.id
      and coalesce(pv.metadata->>'fulfillment_kind','')='BUSINESS_CAPACITY_ADDON'
  loop
    v_org_id:=v_seat_item.organization_id;
    v_seats:=greatest(v_seat_item.seat_count,0)*greatest(v_seat_item.quantity,1);
    if v_org_id is null or v_seats<=0 then
      perform public.record_commerce_fulfillment_issue(v_order.id,v_seat_item.order_item_id,'INVALID_FULFILLMENT_METADATA',
        jsonb_build_object('organization_id',v_org_id,'seats_requested',v_seats));
      continue;
    end if;

    select * into v_subscription from public.organization_subscriptions
    where organization_id=v_org_id and status in('ACTIVE','GRACE_PERIOD')
    order by expires_at desc nulls last limit 1 for update;

    if found then
      update public.organization_subscriptions
      set seat_limit=coalesce(seat_limit,0)+v_seats
      where id=v_subscription.id;
      insert into public.admin_audit_log(actor_user_id,action,target_table,target_id,before_value,after_value)
      values(null,'SEAT_PACK_FULFILLED','organization_subscriptions',v_subscription.id::text,
        jsonb_build_object('seat_limit',v_subscription.seat_limit),
        jsonb_build_object('seat_limit',coalesce(v_subscription.seat_limit,0)+v_seats,'seats_added',v_seats,'order_id',v_order.id,'order_item_id',v_seat_item.order_item_id));
    else
      perform public.record_commerce_fulfillment_issue(v_order.id,v_seat_item.order_item_id,'BUSINESS_SUBSCRIPTION_MISSING',
        jsonb_build_object('organization_id',v_org_id,'seats_requested',v_seats));
      insert into public.admin_audit_log(actor_user_id,action,target_table,target_id,before_value,after_value)
      values(null,'SEAT_PACK_FULFILLMENT_FAILED','organization_subscriptions',v_org_id::text,null,
        jsonb_build_object('reason','NO_ACTIVE_SUBSCRIPTION','seats_requested',v_seats,'order_id',v_order.id,'order_item_id',v_seat_item.order_item_id));
    end if;
  end loop;

  perform public.fulfill_paid_corporate_package_order(v_order.id);

  select count(*) into v_open_issues from public.commerce_fulfillment_issues f where f.order_id=v_order.id and f.resolved_at is null;
  return query select case when v_open_issues>0 then 'PAID_REVIEW_REQUIRED' else 'PAID_PROCESSED' end,
    v_order.id,v_order.order_number,v_order.guest_email;
end; $$;
revoke all on function public.process_commerce_payment_callback(uuid,boolean,text,text,text,jsonb,text,timestamptz) from public;
grant execute on function public.process_commerce_payment_callback(uuid,boolean,text,text,text,jsonb,text,timestamptz) to service_role;

create or replace function public.finalize_authenticated_commerce_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_order public.commerce_orders%rowtype;
  v_now timestamptz:=now();
  v_open_issues integer:=0;
begin
  select * into v_order from public.commerce_orders where id=p_order_id for update;
  if not found or v_order.status<>'PAID' then return jsonb_build_object('ok',false,'code','ORDER_NOT_PAID'); end if;
  if v_order.user_id is null then return jsonb_build_object('ok',false,'code','ACCOUNT_REQUIRED'); end if;

  update public.commerce_orders set activation_claimed_at=coalesce(activation_claimed_at,v_now),updated_at=v_now where id=v_order.id;
  update public.entitlements e
  set user_id=v_order.user_id,status='ACTIVE',starts_at=coalesce(e.starts_at,v_now),
      expires_at=coalesce(e.expires_at,v_now+interval '365 days'),
      grace_ends_at=coalesce(e.grace_ends_at,coalesce(e.expires_at,v_now+interval '365 days')+interval '7 days')
  where e.order_item_id in(select i.id from public.commerce_order_items i where i.order_id=v_order.id);
  update public.activation_tokens set invalidated_at=coalesce(invalidated_at,v_now) where order_id=v_order.id and used_at is null;

  perform public.fulfill_paid_corporate_package_order(v_order.id);

  update public.organization_members m
  set user_id = coalesce(m.user_id, v_order.user_id),
      status = 'ACTIVE'
  from public.commerce_order_items i
  where i.order_id = v_order.id
    and nullif(i.configuration->>'organizationId','') is not null
    and m.organization_id = (i.configuration->>'organizationId')::uuid
    and lower(m.email) = lower(v_order.guest_email);

  select count(*) into v_open_issues from public.commerce_fulfillment_issues f where f.order_id=v_order.id and f.resolved_at is null;
  return jsonb_build_object('ok',true,'order_id',v_order.id,'user_id',v_order.user_id,'review_required',v_open_issues>0,'open_issue_count',v_open_issues);
end; $$;
revoke all on function public.finalize_authenticated_commerce_order(uuid) from public,anon,authenticated;
grant execute on function public.finalize_authenticated_commerce_order(uuid) to service_role;
