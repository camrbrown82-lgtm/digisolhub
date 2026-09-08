-- DigiSol marketing hub: Auth profiles, CRM, email, workflows, assets.
-- Run in the Supabase SQL editor (or `supabase db push`) on a new project.

create extension if not exists pgcrypto;

create table if not exists public.hub_allowlist (
  email text primary key
);

insert into public.hub_allowlist (email)
values ('cam.r.brown82@gmail.com')
on conflict (email) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_hub_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hub_allowlist a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  company text,
  domain text,
  phone text,
  service text,
  source text not null default 'manual',
  tags text[] not null default '{}',
  notes_preview text,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contacts_email_lower_idx
  on public.contacts (lower(email));

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute procedure public.set_updated_at();

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  color text
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  body text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text,
  html text,
  grapes_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute procedure public.set_updated_at();

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_id uuid references public.email_templates (id) on delete set null,
  segment jsonb,
  status text not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete cascade,
  template_id uuid references public.email_templates (id) on delete set null,
  resend_id text,
  status text not null default 'queued',
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sends_resend_id_idx on public.sends (resend_id);
create index if not exists sends_contact_id_idx on public.sends (contact_id);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger text not null default 'new_lead',
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists workflows_set_updated_at on public.workflows;
create trigger workflows_set_updated_at
  before update on public.workflows
  for each row execute procedure public.set_updated_at();

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  status text not null default 'running',
  log jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  public_url text,
  filename text,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  provider text unique not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.tags enable row level security;
alter table public.notes enable row level security;
alter table public.email_templates enable row level security;
alter table public.campaigns enable row level security;
alter table public.sends enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.assets enable row level security;
alter table public.integrations enable row level security;
alter table public.hub_allowlist enable row level security;

drop policy if exists "hub profiles" on public.profiles;
create policy "hub profiles" on public.profiles
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub contacts" on public.contacts;
create policy "hub contacts" on public.contacts
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub tags" on public.tags;
create policy "hub tags" on public.tags
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub notes" on public.notes;
create policy "hub notes" on public.notes
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub email_templates" on public.email_templates;
create policy "hub email_templates" on public.email_templates
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub campaigns" on public.campaigns;
create policy "hub campaigns" on public.campaigns
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub sends" on public.sends;
create policy "hub sends" on public.sends
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub workflows" on public.workflows;
create policy "hub workflows" on public.workflows
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub workflow_runs" on public.workflow_runs;
create policy "hub workflow_runs" on public.workflow_runs
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub assets" on public.assets;
create policy "hub assets" on public.assets
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub integrations" on public.integrations;
create policy "hub integrations" on public.integrations
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub allowlist read" on public.hub_allowlist;
create policy "hub allowlist read" on public.hub_allowlist
  for select to authenticated
  using (public.is_hub_user());

insert into storage.buckets (id, name, public)
values
  ('assets', 'assets', true),
  ('email-images', 'email-images', true),
  ('ai-posters', 'ai-posters', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read hub media" on storage.objects;
create policy "Public read hub media"
  on storage.objects for select
  to public
  using (bucket_id in ('assets', 'email-images', 'ai-posters'));

drop policy if exists "Hub write media" on storage.objects;
create policy "Hub write media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('assets', 'email-images', 'ai-posters')
    and public.is_hub_user()
  );

drop policy if exists "Hub update media" on storage.objects;
create policy "Hub update media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('assets', 'email-images', 'ai-posters')
    and public.is_hub_user()
  );

drop policy if exists "Hub delete media" on storage.objects;
create policy "Hub delete media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('assets', 'email-images', 'ai-posters')
    and public.is_hub_user()
  );
