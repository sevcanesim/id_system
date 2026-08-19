-- v25.8.5 — Kurumsal Bağlantılar (Ürün Kataloğu, Şirket Sunumu,
-- Toplantı Planla, Referans Projeler)
--
-- Kart şablonundaki "KURUMSAL BAĞLANTILAR" bölümü (CardTemplate.tsx)
-- `data.links` boşsa şirketin web sitesine / e-postasına düşen sabit
-- kodlanmış dört yer tutucuyla render ediliyordu — İK bu dört bağlantıyı
-- gerçekten yönetemiyordu, özellikle PDF olarak yüklenen bir ürün
-- kataloğu koyacak bir yer yoktu. Bu migration bunu gerçek, İK'nın
-- panelden yönetebildiği bir alana çeviriyor.

create table if not exists public.organization_links(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('CATALOG','PRESENTATION','MEETING','REFERENCES')),
  label text,
  subtitle text,
  link_type text not null check (link_type in ('URL','FILE')),
  url text,
  file_path text,
  file_name text,
  file_size integer,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(organization_id, kind)
);
alter table public.organization_links enable row level security;
drop policy if exists "Members can read corporate links" on public.organization_links;
create policy "Members can read corporate links" on public.organization_links
for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=auth.uid() and m.status='ACTIVE'));

-- Yazma yalnızca /api/organizations/links[/upload] route'larından, service-role
-- admin client ile (canManageTemplates → OWNER/ADMIN) yapılır; bu yüzden
-- insert/update/delete için ayrı bir RLS politikasına gerek yok.

-- PDF (ürün kataloğu, şirket sunumu, referans dokümanı) yüklemek için
-- yeni, herkese açık okumalı bucket. `profile-images` bucket'ıyla aynı
-- desen (bkz. 001_initial_schema_fixed.sql); farkı yalnızca PDF kabul
-- etmesi ve yazmanın istemciden değil sunucudan yapılması.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organization-assets', 'organization-assets', true, 20971520, array['application/pdf'])
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Organization assets are public" on storage.objects;
create policy "Organization assets are public"
on storage.objects for select
using (bucket_id = 'organization-assets');

comment on table public.organization_links is 'Kurumsal kart şablonundaki KURUMSAL BAĞLANTILAR bölümünü besleyen 4 sabit slot (CATALOG/PRESENTATION/MEETING/REFERENCES); her biri ya bir URL ya da yüklenmiş bir PDF.';
