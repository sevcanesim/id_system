create or replace function public.resolve_recovered_payment_callback_issue(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.commerce_orders
    where id = p_order_id
      and status = 'PAID'
  ) then
    return;
  end if;

  update public.commerce_fulfillment_issues
  set resolved_at = now(),
      resolution_note = coalesce(resolution_note, 'PayTR callback tekrar işlendi ve ödeme kaydı tamamlandı.'),
      updated_at = now()
  where order_id = p_order_id
    and issue_code = 'PAYMENT_CALLBACK_COMMIT_FAILED'
    and resolved_at is null;
end;
$$;

revoke all on function public.resolve_recovered_payment_callback_issue(uuid) from public, anon, authenticated;
grant execute on function public.resolve_recovered_payment_callback_issue(uuid) to service_role;
