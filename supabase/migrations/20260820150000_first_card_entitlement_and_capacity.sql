-- First individual card must consume an unused ACTIVE entitlement.
-- First organization card must fit digital_card_limit.
-- Same-owner CORP retry attaches without leaving an open review issue
-- that blocks the company panel CTA.

create or replace function public.save_own_card_profile(
  p_user_id uuid, p_profile_id uuid, p_organization_id uuid, p_patch jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_member public.organization_members%rowtype;
  v_template public.organization_card_templates%rowtype;
  v_org public.organizations%rowtype;
  v_fields jsonb := '{}'::jsonb;
  v_existing public.card_profiles%rowtype;
  v_name text; v_email text; v_role text; v_company text; v_phone text;
  v_catalog_count integer; v_title_ok boolean;
  v_mode_name text; v_mode_email text; v_mode_company text; v_mode_title text; v_mode_phone text;
  v_saved public.card_profiles%rowtype;
  v_entitlement_id uuid;
  v_card_count integer;
  v_card_limit integer;
begin
  if p_profile_id is not null then
    select * into v_existing from public.card_profiles where id=p_profile_id and user_id=p_user_id for update;
    if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  end if;

  if v_existing.id is not null then
    if v_existing.organization_id is not null and p_organization_id is null then
      return jsonb_build_object('ok',false,'code','ORG_CONTEXT_REQUIRED');
    end if;
    if p_organization_id is not null and v_existing.organization_id is not null
       and v_existing.organization_id <> p_organization_id then
      return jsonb_build_object('ok',false,'code','FORBIDDEN');
    end if;
  end if;

  if p_organization_id is not null then
    select * into v_member from public.organization_members
      where organization_id=p_organization_id and user_id=p_user_id and status='ACTIVE';
    if not found then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
    select * into v_org from public.organizations where id=p_organization_id;
    select * into v_template from public.organization_card_templates
      where organization_id=p_organization_id and is_default=true limit 1;
    v_fields := coalesce(v_template.fields,'{}'::jsonb);
  end if;

  v_name := coalesce(nullif(p_patch->>'name',''), v_existing.name);
  v_email := coalesce(nullif(p_patch->>'email',''), v_existing.email);
  v_role := coalesce(nullif(p_patch->>'role',''), v_existing.role);
  v_company := coalesce(nullif(p_patch->>'company',''), v_existing.company);
  v_phone := coalesce(nullif(p_patch->>'phone',''), v_existing.phone);

  if v_member.id is not null then
    v_mode_company := card_field_lock_mode(v_fields,'lockCompany','free');
    v_mode_title := card_field_lock_mode(v_fields,'lockTitle','free');
    v_mode_name := card_field_lock_mode(v_fields,'lockName','suggested');
    v_mode_email := card_field_lock_mode(v_fields,'lockEmail','suggested');
    v_mode_phone := card_field_lock_mode(v_fields,'lockPhone','free');

    if v_mode_company = 'locked' then
      v_company := coalesce(v_org.name, v_company);
    elsif v_mode_company = 'suggested' then
      if v_company is null or v_company = '' then
        v_company := v_org.name;
      elsif v_existing.id is not null and v_existing.company is distinct from v_company then
        insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
        values(p_organization_id,v_member.id,v_existing.id,'company',v_existing.company,v_company,p_user_id);
      end if;
    end if;

    if v_mode_title = 'locked' then
      v_role := coalesce(v_member.title, v_role);
    else
      select count(*) into v_catalog_count from public.organization_job_titles where organization_id=p_organization_id;
      if v_mode_title = 'suggested' and (v_role is null or v_role = '') then
        v_role := v_member.title;
      end if;
      if v_catalog_count>0 and v_role is not null and v_role<>'' then
        select exists(
          select 1 from public.organization_job_titles
          where organization_id=p_organization_id and title=v_role
        ) into v_title_ok;
        if not v_title_ok then
          return jsonb_build_object('ok',false,'code','TITLE_NOT_IN_CATALOG');
        end if;
      end if;
      if v_mode_title = 'suggested' and v_existing.id is not null and v_existing.role is distinct from v_role then
        insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
        values(p_organization_id,v_member.id,v_existing.id,'title',v_existing.role,v_role,p_user_id);
      end if;
    end if;

    if v_mode_name = 'locked' then
      v_name := coalesce(v_member.full_name, v_name);
    elsif v_existing.id is not null and v_existing.name is distinct from v_name then
      insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
      values(p_organization_id,v_member.id,v_existing.id,'name',v_existing.name,v_name,p_user_id);
    end if;

    if v_mode_email = 'locked' then
      v_email := coalesce(v_member.email, v_email);
    elsif v_existing.id is not null and v_existing.email is distinct from v_email then
      insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
      values(p_organization_id,v_member.id,v_existing.id,'email',v_existing.email,v_email,p_user_id);
    end if;

    if v_mode_phone = 'locked' then
      v_phone := coalesce(nullif(v_fields->>'phone',''), v_phone);
    elsif v_mode_phone = 'suggested' then
      if v_phone is null or v_phone = '' then
        v_phone := nullif(v_fields->>'phone','');
      elsif v_existing.id is not null and v_existing.phone is distinct from v_phone then
        insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
        values(p_organization_id,v_member.id,v_existing.id,'phone',v_existing.phone,v_phone,p_user_id);
      end if;
    end if;
  end if;

  if p_profile_id is not null then
    update public.card_profiles set
      organization_id=coalesce(organization_id,p_organization_id),
      name=v_name, role=v_role, company=v_company, phone=v_phone,
      whatsapp=coalesce(nullif(p_patch->>'whatsapp',''), whatsapp),
      email=v_email,
      website=coalesce(nullif(p_patch->>'website',''), website),
      linkedin=coalesce(nullif(p_patch->>'linkedin',''), linkedin),
      instagram=coalesce(nullif(p_patch->>'instagram',''), instagram),
      location=coalesce(nullif(p_patch->>'location',''), location),
      image_url=coalesce(nullif(p_patch->>'image_url',''), image_url),
      bio=case when p_patch ? 'bio' then nullif(p_patch->>'bio','') else bio end,
      slug=coalesce(nullif(p_patch->>'slug',''), slug),
      is_published=coalesce((p_patch->>'is_published')::boolean, is_published)
    where id=p_profile_id
    returning * into v_saved;
  else
    v_entitlement_id := null;
    if p_organization_id is null then
      begin
        v_entitlement_id := nullif(trim(p_patch->>'entitlement_id'), '')::uuid;
      exception when invalid_text_representation then
        return jsonb_build_object('ok',false,'code','ENTITLEMENT_INVALID');
      end;
      if v_entitlement_id is null then
        return jsonb_build_object('ok',false,'code','ENTITLEMENT_REQUIRED');
      end if;
      perform 1
        from public.entitlements
        where id = v_entitlement_id
          and user_id = p_user_id
          and status = 'ACTIVE'
          and kind in ('NFC_PHYSICAL_CARD', 'BUSINESS_CARD')
        for update;
      if not found then
        return jsonb_build_object('ok',false,'code','ENTITLEMENT_INVALID');
      end if;
      if exists (select 1 from public.card_profiles where entitlement_id = v_entitlement_id) then
        return jsonb_build_object('ok',false,'code','ENTITLEMENT_IN_USE');
      end if;
    else
      select coalesce(digital_card_limit, 0) into v_card_limit
        from public.organization_entitlements
        where organization_id = p_organization_id;
      if not found then
        v_card_limit := 0;
      end if;
      select count(*) into v_card_count
        from public.card_profiles
        where organization_id = p_organization_id;
      if v_card_count >= v_card_limit then
        return jsonb_build_object('ok',false,'code','DIGITAL_CARD_LIMIT_REACHED');
      end if;
    end if;

    insert into public.card_profiles(
      user_id, organization_id, entitlement_id, slug, name, role, company, phone, whatsapp, email,
      website, linkedin, instagram, location, image_url, bio, is_published
    ) values(
      p_user_id,
      p_organization_id,
      v_entitlement_id,
      p_patch->>'slug', v_name, v_role, v_company, v_phone,
      nullif(p_patch->>'whatsapp',''), v_email,
      nullif(p_patch->>'website',''), nullif(p_patch->>'linkedin',''),
      nullif(p_patch->>'instagram',''), nullif(p_patch->>'location',''),
      nullif(p_patch->>'image_url',''), nullif(p_patch->>'bio',''), coalesce((p_patch->>'is_published')::boolean,false)
    ) returning * into v_saved;
  end if;

  return jsonb_build_object('ok',true,'profile',to_jsonb(v_saved));
exception when unique_violation then
  if sqlerrm ilike '%card_profiles_entitlement_id%' then
    return jsonb_build_object('ok',false,'code','ENTITLEMENT_IN_USE');
  end if;
  return jsonb_build_object('ok',false,'code','SLUG_TAKEN');
end; $$;

revoke all on function public.save_own_card_profile(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_own_card_profile(uuid,uuid,uuid,jsonb) to service_role;

comment on function public.save_own_card_profile is
  'Kart profili yazma tek giriş noktası. Bireysel INSERT kullanılmamış ACTIVE entitlement ister; kurumsal INSERT digital_card_limit kotasını sunucuda zorlar.';

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
        update public.commerce_fulfillment_issues
        set resolved_at = coalesce(resolved_at, now()),
            resolution_note = coalesce(resolution_note, 'Aynı sahip tekrar ödemesi mevcut şirkete bağlandı.'),
            updated_at = now()
        where order_id = v_order.id
          and order_item_id = v_item.id
          and issue_code = 'CORPORATE_DUPLICATE_TAX'
          and resolved_at is null;
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
