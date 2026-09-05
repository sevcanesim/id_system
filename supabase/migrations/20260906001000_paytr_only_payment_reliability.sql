-- PayTR is the only live payment authority. Preserve old attempts for audit,
-- but prevent all new non-PayTR attempts and make callback processing
-- observable without retaining payment payloads or customer PII.

alter table public.commerce_payment_attempts
  alter column provider set default 'PAYTR';

create or replace function public.enforce_paytr_commerce_payment_provider()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.provider <> 'PAYTR' then
    raise exception using errcode='22023', message='Yeni ticari ödeme denemelerinde yalnız PAYTR kullanılabilir.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_paytr_commerce_payment_provider on public.commerce_payment_attempts;
create trigger trg_enforce_paytr_commerce_payment_provider
before insert on public.commerce_payment_attempts
for each row execute function public.enforce_paytr_commerce_payment_provider();

create table if not exists public.payment_callback_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'PAYTR'),
  provider_reference_hash text not null,
  amount_kurus integer not null check (amount_kurus > 0),
  status text not null check (status in ('RECEIVED', 'PROCESSED', 'RETRYING')),
  attempt_id uuid references public.commerce_payment_attempts(id) on delete set null,
  order_id uuid references public.commerce_orders(id) on delete set null,
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference_hash)
);

create index if not exists payment_callback_receipts_status_idx
  on public.payment_callback_receipts(status, updated_at desc);
create index if not exists payment_callback_receipts_order_idx
  on public.payment_callback_receipts(order_id, received_at desc);
alter table public.payment_callback_receipts enable row level security;
revoke all on public.payment_callback_receipts from anon, authenticated, public;
grant all on public.payment_callback_receipts to service_role;

create index if not exists system_error_logs_source_time_idx
  on public.system_error_logs(source, occurred_at desc);
create index if not exists system_error_logs_organization_time_idx
  on public.system_error_logs(organization_id, occurred_at desc)
  where organization_id is not null;

-- The checkout route permits a capacity add-on only against an ACTIVE
-- subscription. Callback fulfilment must enforce exactly the same invariant.
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
      values(v_order.id,v_order.status,'AWAITING_PAYMENT','PAYMENT','PayTR ödeme doğrulamadı');
    return query select 'FAILED'::text,v_order.id,v_order.order_number,v_order.guest_email; return;
  end if;

  update public.commerce_payment_attempts set status='PAID',provider_payment_id=coalesce(p_provider_payment_id,provider_payment_id),
    error_code=null,error_message=null,raw_result=p_raw_result,updated_at=now() where id=v_attempt.id;
  update public.commerce_orders set status='PAID',paid_at=v_paid_at,activation_deadline_at=v_paid_at+interval '30 days' where id=v_order.id;
  insert into public.commerce_order_status_history(order_id,from_status,to_status,source,note)
    values(v_order.id,v_order.status,'PAID','PAYMENT','PayTR ödeme doğrulandı');

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
    where organization_id=v_org_id and status='ACTIVE'
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
      perform public.record_commerce_fulfillment_issue(v_order.id,v_seat_item.order_item_id,'BUSINESS_SUBSCRIPTION_NOT_ACTIVE',
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

-- Invoice snapshots reflect the actual single payment provider. Dispatch to
-- Mysoft remains intentionally disabled until its documented API contract and
-- production issuer credentials are configured.
create or replace function public.queue_paid_commerce_invoice_job()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_snapshot jsonb;
  v_payment_provider text;
begin
  if new.status <> 'PAID' then return new; end if;
  if TG_OP = 'UPDATE' and old.status = 'PAID' then return new; end if;

  select provider into v_payment_provider
  from public.commerce_payment_attempts
  where order_id = new.id and status = 'PAID'
  order by updated_at desc limit 1;

  select jsonb_build_object(
    'version', 2,
    'order', jsonb_build_object('id',new.id,'number',new.order_number,'currency',new.currency,'subtotalKurus',new.subtotal_kurus,'shippingKurus',new.shipping_kurus,'totalKurus',new.total_kurus,'paidAt',coalesce(new.paid_at,now())),
    'buyer', jsonb_build_object('name',new.customer_name,'email',new.guest_email,'phone',new.customer_phone,'companyName',new.company_name,'taxNumber',new.tax_number,'taxOffice',new.tax_office,'countryCode',new.country_code),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id',item.id,'name',item.product_name,'sku',item.configuration->>'sku','kind',item.product_kind,'quantity',item.quantity,'unitPriceKurus',item.unit_price_kurus) order by item.id) from public.commerce_order_items item where item.order_id=new.id),'[]'::jsonb),
    'shipping', coalesce((select jsonb_build_object('recipientName',address.recipient_name,'phone',address.phone,'addressLine',address.address_line,'district',address.district,'city',address.city,'postalCode',address.postal_code,'countryCode',address.country_code) from public.shipping_addresses address where address.order_id=new.id),'null'::jsonb),
    'payment', jsonb_build_object('provider',coalesce(v_payment_provider,'PAYTR'),'method','KREDIKARTI/BANKAKARTI','paidAt',coalesce(new.paid_at,now()))
  ) into v_snapshot;

  insert into public.commerce_invoice_jobs(order_id,idempotency_key,invoice_snapshot)
  values(new.id,'commerce-invoice:'||new.id::text,v_snapshot)
  on conflict(order_id) do nothing;
  return new;
end;
$$;
