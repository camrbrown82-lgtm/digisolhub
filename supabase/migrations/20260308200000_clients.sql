-- Client workspaces: keep DigiSol work separate per company.
-- Run this in the Supabase SQL editor after the first hub migration.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute procedure public.set_updated_at();

alter table public.contacts add column if not exists client_id uuid references public.clients (id) on delete set null;
alter table public.email_templates add column if not exists client_id uuid references public.clients (id) on delete set null;
alter table public.campaigns add column if not exists client_id uuid references public.clients (id) on delete set null;
alter table public.workflows add column if not exists client_id uuid references public.clients (id) on delete set null;
alter table public.assets add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists contacts_client_id_idx on public.contacts (client_id);
create index if not exists email_templates_client_id_idx on public.email_templates (client_id);
create index if not exists campaigns_client_id_idx on public.campaigns (client_id);
create index if not exists workflows_client_id_idx on public.workflows (client_id);
create index if not exists assets_client_id_idx on public.assets (client_id);

alter table public.clients enable row level security;

drop policy if exists "hub clients" on public.clients;
create policy "hub clients" on public.clients
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
