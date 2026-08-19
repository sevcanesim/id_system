-- Kurumsal İçerik ve Analitik 2.0
-- Kurumsal PDF/URL kaynaklarının yayın durumunu ve etkileşimlerini izler.

alter table public.organization_links
  add column if not exists is_published boolean not null default true,
  add column if not exists published_at timestamptz;

update public.organization_links
set published_at = coalesce(published_at, updated_at)
where is_published = true and published_at is null;

create table if not exists public.organization_link_events(
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_link_id uuid not null references public.organization_links(id) on delete cascade,
  profile_id uuid references public.card_profiles(id) on delete set null,
  event_type text not null check (event_type in ('CLICK','DOWNLOAD')),
  country text,
  occurred_at timestamptz not null default now()
);

create index if not exists organization_link_events_org_time_idx
  on public.organization_link_events(organization_id, occurred_at desc);
create index if not exists organization_link_events_link_time_idx
  on public.organization_link_events(organization_link_id, occurred_at desc);
create index if not exists organization_link_events_profile_time_idx
  on public.organization_link_events(profile_id, occurred_at desc);

alter table public.organization_link_events enable row level security;
-- Okuma/yazma yalnız yetki denetimli server route'larından service-role ile yapılır.

comment on table public.organization_link_events is
  'Kurumsal kartlardaki yayınlanmış PDF/URL içeriklerinin tıklama ve indirme olayları.';
