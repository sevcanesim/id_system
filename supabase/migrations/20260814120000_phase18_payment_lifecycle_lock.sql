-- Phase 18: payment -> fulfillment -> activation lifecycle lock.
-- Payment success is immutable; post-payment fulfillment failures are recorded
-- explicitly for reconciliation instead of being misreported as payment failure.

-- Email event vocabulary used by the current account-first callback.
alter table public.commerce_email_events
  drop constraint if exists commerce_email_events_event_type_check;
alter table public.commerce_email_events
  add constraint commerce_email_events_event_type_check
  check (event_type in (
    'ACTIVATION','ACTIVATION_RESEND','SHIPPING','RENEWAL',
    'ORDER_READY','ORDER_REVIEW_REQUIRED'
  ));

create table if not exists public.commerce_fulfillment_issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  order_item_id uuid references public.commerce_order_items(id) on delete cascade,
  issue_code text not null check (issue_code in (
    'RENEWAL_ENTITLEMENT_MISSING',
    'BUSINESS_SUBSCRIPTION_MISSING',
    'INVALID_FULFILLMENT_METADATA'
  )),
  details jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commerce_fulfillment_issues_order_idx
  on public.commerce_fulfillment_issues(order_id, created_at desc);
create unique index if not exists commerce_fulfillment_issues_open_uidx
  on public.commerce_fulfillment_issues(order_id, coalesce(order_item_id, '00000000-0000-0000-0000-000000000000'::uuid), issue_code)
  where resolved_at is null;
alter table public.commerce_fulfillment_issues enable row level security;
drop policy if exists "Users can read own fulfillment issues" on public.commerce_fulfillment_issues;
create policy "Users can read own fulfillment issues"
on public.commerce_fulfillment_issues for select to authenticated
using (exists(
  select 1 from public.commerce_orders o
  where o.id=order_id and o.user_id=auth.uid()
));

create or replace function public.record_commerce_fulfillment_issue(
  p_order_id uuid,
  p_order_item_id uuid,
  p_issue_code text,
  p_details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.commerce_fulfillment_issues(order_id,order_item_id,issue_code,details)
  values(p_order_id,p_order_item_id,p_issue_code,coalesce(p_details,'{}'::jsonb))
  on conflict do nothing;
end; $$;
revoke all on function public.record_commerce_fulfillment_issue(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_commerce_fulfillment_issue(uuid,uuid,text,jsonb) to service_role;

-- Route the candidate entitlement created by the payment callback. Renewal,
-- extra card, replacement and seat add-ons must never create a fresh 365-day
-- personal entitlement. Renewal extends the existing service term and its
-- grace window atomically.
create or replace function public.route_commerce_fulfillment()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_item public.commerce_order_items%rowtype;
  v_sku text;
  v_kind text;
  v_org_id uuid;
  v_card_count integer;
  v_index integer;
  v_user_id uuid;
  v_existing public.entitlements%rowtype;
  v_new_expiry timestamptz;
begin
  select i.* into v_item from public.commerce_order_items i where i.id=new.order_item_id;
  if not found then return new; end if;

  select pv.sku,
         coalesce(pv.metadata->>'fulfillment_kind',
           case when pv.sku='YENOMI-NFC-EXTRA' then 'EXTRA_CARD'
                when pv.sku like 'YENOMI-BUSINESS-SEATS-%' then 'BUSINESS_CAPACITY_ADDON'
                else 'INITIAL_BUNDLE' end)
  into v_sku,v_kind
  from public.product_variants pv where pv.id=v_item.variant_id;
  if not found then return new; end if;

  if v_kind='DIGITAL_RENEWAL' then
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
        v_item.order_id,v_item.id,'RENEWAL_ENTITLEMENT_MISSING',
        jsonb_build_object('user_id',v_user_id,'sku',v_sku)
      );
      return null;
    end if;

    v_new_expiry := greatest(coalesce(v_existing.expires_at,now()),now()) + interval '365 days';
    update public.entitlements
    set status='ACTIVE',
        expires_at=v_new_expiry,
        grace_ends_at=v_new_expiry + interval '7 days',
        updated_at=now()
    where id=v_existing.id;
    return null;
  end if;

  v_org_id:=nullif(v_item.configuration->>'organizationId','')::uuid;
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
  return new;
end; $$;
revoke all on function public.route_commerce_fulfillment() from public,anon,authenticated;
grant execute on function public.route_commerce_fulfillment() to service_role;

-- Exactly-once payment callback. Payment state is committed once. Fulfillment
-- anomalies become explicit review records and never encourage a second charge.
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
  cross join lateral generate_series(1,greatest(item.quantity,1)) generated(instance_no)
  where item.order_id=v_order.id
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

  select count(*) into v_open_issues from public.commerce_fulfillment_issues f where f.order_id=v_order.id and f.resolved_at is null;
  return query select case when v_open_issues>0 then 'PAID_REVIEW_REQUIRED' else 'PAID_PROCESSED' end,
    v_order.id,v_order.order_number,v_order.guest_email;
end; $$;
revoke all on function public.process_commerce_payment_callback(uuid,boolean,text,text,text,jsonb,text,timestamptz) from public;
grant execute on function public.process_commerce_payment_callback(uuid,boolean,text,text,text,jsonb,text,timestamptz) to service_role;

-- Account-first auto-claim remains idempotent and reports unresolved fulfillment
-- issues to callers without turning a paid order back into a payment failure.
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
  select count(*) into v_open_issues from public.commerce_fulfillment_issues f where f.order_id=v_order.id and f.resolved_at is null;
  return jsonb_build_object('ok',true,'order_id',v_order.id,'user_id',v_order.user_id,'review_required',v_open_issues>0,'open_issue_count',v_open_issues);
end; $$;
revoke all on function public.finalize_authenticated_commerce_order(uuid) from public,anon,authenticated;
grant execute on function public.finalize_authenticated_commerce_order(uuid) to service_role;
