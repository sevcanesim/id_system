-- v21.3: çalışan daveti, kurumsal şablonlar ve lisans yaşam döngüsü.
create table if not exists public.organization_invites(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 member_id uuid not null references public.organization_members(id) on delete cascade, token_hash text unique not null,
 expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists organization_invites_member_idx on public.organization_invites(member_id,created_at desc);
alter table public.organization_invites enable row level security;

create table if not exists public.organization_card_templates(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, is_default boolean not null default false, logo_url text, primary_color text,
 fields jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists organization_default_template_uidx on public.organization_card_templates(organization_id) where is_default=true;
alter table public.organization_card_templates enable row level security;
drop policy if exists "Members can read templates" on public.organization_card_templates;
create policy "Members can read templates" on public.organization_card_templates for select to authenticated using(exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=auth.uid() and m.status='ACTIVE'));

alter table public.entitlements add column if not exists expires_at timestamptz;
alter table public.entitlements add column if not exists grace_ends_at timestamptz;
