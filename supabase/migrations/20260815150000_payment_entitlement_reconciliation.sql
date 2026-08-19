-- Roadmap Phase 0: payment -> entitlement -> claim reconciliation hardening.
-- A successful charge is immutable. Missing post-payment fulfillment is repaired
-- idempotently and is never represented to the customer as a failed payment.

alter table public.commerce_fulfillment_issues
  drop constraint if exists commerce_fulfillment_issues_issue_code_check;
alter table public.commerce_fulfillment_issues
  add constraint commerce_fulfillment_issues_issue_code_check
  check (issue_code in (
    'RENEWAL_ENTITLEMENT_MISSING',
    'BUSINESS_SUBSCRIPTION_MISSING',
    'INVALID_FULFILLMENT_METADATA',
    'AUTHENTICATED_CLAIM_FAILED',
    'PAID_ENTITLEMENT_MISSING'
  ));

-- Repair a single paid account-first order. Only SKUs that are supposed to
-- create a digital service entitlement are recreated. Renewal/additional-card/
-- replacement/seat-pack lines are deliberately excluded so reconciliation can
-- never accidentally grant another term or duplicate capacity.
create or replace function public.repair_paid_commerce_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_order public.commerce_orders%rowtype;
  v_now timestamptz:=now();
  v_expected integer:=0;
  v_existing integer:=0;
  v_inserted integer:=0;
  v_open_issues integer:=0;
begin
  select * into v_order
  from public.commerce_orders
  where id=p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'code','ORDER_NOT_FOUND');
  end if;
  if v_order.status<>'PAID' then
    return jsonb_build_object('ok',false,'code','ORDER_NOT_PAID');
  end if;
  if v_order.user_id is null then
    return jsonb_build_object('ok',false,'code','ACCOUNT_REQUIRED');
  end if;

  select coalesce(sum(greatest(i.quantity,1)),0)::integer
  into v_expected
  from public.commerce_order_items i
  left join public.product_variants pv on pv.id=i.variant_id
  where i.order_id=v_order.id
    and coalesce(
      pv.metadata->>'fulfillment_kind',
      case when coalesce((pv.metadata->>'digital_service_included')::boolean,false) then 'INITIAL_BUNDLE' else '' end
    ) in ('INITIAL_BUNDLE','BUSINESS_INITIAL');

  select count(*)::integer
  into v_existing
  from public.entitlements e
  join public.commerce_order_items i on i.id=e.order_item_id
  left join public.product_variants pv on pv.id=i.variant_id
  where i.order_id=v_order.id
    and coalesce(
      pv.metadata->>'fulfillment_kind',
      case when coalesce((pv.metadata->>'digital_service_included')::boolean,false) then 'INITIAL_BUNDLE' else '' end
    ) in ('INITIAL_BUNDLE','BUSINESS_INITIAL');

  if v_existing < v_expected then
    insert into public.entitlements(order_item_id,instance_no,kind,status)
    select i.id,g.instance_no,i.product_kind,'PENDING_ACTIVATION'
    from public.commerce_order_items i
    left join public.product_variants pv on pv.id=i.variant_id
    cross join lateral generate_series(1,greatest(i.quantity,1)) g(instance_no)
    where i.order_id=v_order.id
      and coalesce(
        pv.metadata->>'fulfillment_kind',
        case when coalesce((pv.metadata->>'digital_service_included')::boolean,false) then 'INITIAL_BUNDLE' else '' end
      ) in ('INITIAL_BUNDLE','BUSINESS_INITIAL')
    on conflict(order_item_id,instance_no) do nothing;
    get diagnostics v_inserted=row_count;
  end if;

  update public.entitlements e
  set user_id=v_order.user_id,
      status='ACTIVE',
      starts_at=coalesce(e.starts_at,v_now),
      expires_at=coalesce(e.expires_at,v_now+interval '365 days'),
      grace_ends_at=coalesce(e.grace_ends_at,coalesce(e.expires_at,v_now+interval '365 days')+interval '7 days')
  where e.order_item_id in(
    select i.id from public.commerce_order_items i where i.order_id=v_order.id
  );

  update public.commerce_orders
  set activation_claimed_at=coalesce(activation_claimed_at,v_now),updated_at=v_now
  where id=v_order.id;

  update public.activation_tokens
  set invalidated_at=coalesce(invalidated_at,v_now)
  where order_id=v_order.id and used_at is null;

  update public.commerce_fulfillment_issues
  set resolved_at=coalesce(resolved_at,v_now),
      resolution_note=coalesce(resolution_note,'Otomatik ödeme/entitlement reconciliation ile onarıldı.'),
      updated_at=v_now
  where order_id=v_order.id
    and resolved_at is null
    and issue_code in ('AUTHENTICATED_CLAIM_FAILED','PAID_ENTITLEMENT_MISSING');

  select count(*) into v_open_issues
  from public.commerce_fulfillment_issues f
  where f.order_id=v_order.id and f.resolved_at is null;

  return jsonb_build_object(
    'ok',true,
    'order_id',v_order.id,
    'expected_entitlements',v_expected,
    'existing_entitlements_before',v_existing,
    'inserted_entitlements',v_inserted,
    'review_required',v_open_issues>0,
    'open_issue_count',v_open_issues
  );
end;
$$;
revoke all on function public.repair_paid_commerce_order(uuid) from public,anon,authenticated;
grant execute on function public.repair_paid_commerce_order(uuid) to service_role;

-- Scan paid account-first orders and repair the exact broken state requested by
-- the commerce backlog: paid + missing entitlement and/or paid + not claimed.
create or replace function public.reconcile_paid_commerce_orders(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_row record;
  v_result jsonb;
  v_checked integer:=0;
  v_repaired integer:=0;
  v_failed integer:=0;
begin
  for v_row in
    select o.id
    from public.commerce_orders o
    where o.status='PAID'
      and o.user_id is not null
      and (
        o.activation_claimed_at is null
        or exists(
          select 1
          from public.commerce_order_items i
          left join public.product_variants pv on pv.id=i.variant_id
          cross join lateral generate_series(1,greatest(i.quantity,1)) g(instance_no)
          where i.order_id=o.id
            and coalesce(
              pv.metadata->>'fulfillment_kind',
              case when coalesce((pv.metadata->>'digital_service_included')::boolean,false) then 'INITIAL_BUNDLE' else '' end
            ) in ('INITIAL_BUNDLE','BUSINESS_INITIAL')
            and not exists(
              select 1 from public.entitlements e
              where e.order_item_id=i.id and e.instance_no=g.instance_no
            )
        )
      )
    order by o.paid_at asc nulls first,o.created_at asc
    limit greatest(1,least(coalesce(p_limit,100),500))
  loop
    v_checked:=v_checked+1;
    begin
      v_result:=public.repair_paid_commerce_order(v_row.id);
      if coalesce((v_result->>'ok')::boolean,false) then
        v_repaired:=v_repaired+1;
      else
        v_failed:=v_failed+1;
      end if;
    exception when others then
      v_failed:=v_failed+1;
    end;
  end loop;

  return jsonb_build_object('ok',v_failed=0,'checked',v_checked,'repaired',v_repaired,'failed',v_failed);
end;
$$;
revoke all on function public.reconcile_paid_commerce_orders(integer) from public,anon,authenticated;
grant execute on function public.reconcile_paid_commerce_orders(integer) to service_role;
