-- Kurumsal içerik sürümleme ve planlı yayınlama.

alter table public.organization_links
  add column if not exists publish_at timestamptz;

update public.organization_links
set publish_at = coalesce(publish_at, published_at, updated_at)
where is_published = true and publish_at is null;

create table if not exists public.organization_link_versions(
  id uuid primary key default gen_random_uuid(),
  organization_link_id uuid references public.organization_links(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('CATALOG','PRESENTATION','MEETING','REFERENCES')),
  label text,
  subtitle text,
  link_type text check (link_type in ('URL','FILE')),
  url text,
  file_path text,
  file_name text,
  file_size bigint,
  is_published boolean not null default false,
  publish_at timestamptz,
  changed_by uuid references auth.users(id) on delete set null,
  change_reason text not null default 'UPDATE' check (change_reason in ('CREATE','UPDATE','DELETE','ROLLBACK')),
  created_at timestamptz not null default now()
);

create index if not exists organization_link_versions_org_kind_time_idx
  on public.organization_link_versions(organization_id, kind, created_at desc);

alter table public.organization_link_versions enable row level security;
-- Sürüm geçmişi yalnız yetki denetimli server route'larından service-role ile okunur/yazılır.

create or replace function public.capture_organization_link_version()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  snapshot public.organization_links%rowtype;
  reason text;
begin
  if tg_op = 'INSERT' then
    snapshot := new;
    reason := 'CREATE';
  elsif tg_op = 'DELETE' then
    snapshot := old;
    reason := 'DELETE';
  else
    snapshot := old;
    reason := case when current_setting('app.organization_link_rollback', true) = 'true' then 'ROLLBACK' else 'UPDATE' end;
  end if;

  insert into public.organization_link_versions(
    organization_link_id,organization_id,kind,label,subtitle,link_type,url,
    file_path,file_name,file_size,is_published,publish_at,changed_by,change_reason
  ) values(
    case when tg_op = 'DELETE' then null else snapshot.id end,
    snapshot.organization_id,snapshot.kind,snapshot.label,snapshot.subtitle,
    snapshot.link_type,snapshot.url,snapshot.file_path,snapshot.file_name,snapshot.file_size,
    snapshot.is_published,snapshot.publish_at,snapshot.updated_by,reason
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

drop trigger if exists organization_link_version_trigger on public.organization_links;
create trigger organization_link_version_trigger
after insert or update or delete on public.organization_links
for each row execute function public.capture_organization_link_version();

comment on table public.organization_link_versions is
  'Kurumsal PDF/URL slotlarının geri alınabilir değişiklik geçmişi.';
