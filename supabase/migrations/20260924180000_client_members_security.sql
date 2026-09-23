-- Multi-tenant foundation: membership before opening Hub to customers.
-- App code can start checking client_members; RLS policies can migrate next.

create table if not exists public.client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create index if not exists client_members_user_idx
  on public.client_members (user_id);

create index if not exists client_members_client_idx
  on public.client_members (client_id);

alter table public.client_members enable row level security;

drop policy if exists "hub client_members read" on public.client_members;
create policy "hub client_members read" on public.client_members
  for select to authenticated
  using (public.is_hub_user());

drop policy if exists "hub client_members write" on public.client_members;
create policy "hub client_members write" on public.client_members
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

-- Prefer per-tenant email uniqueness when client_id is present.
-- Keep legacy global unique if it already exists; add composite for new rows.
create unique index if not exists contacts_client_email_lower_uidx
  on public.contacts (client_id, lower(email))
  where client_id is not null and email is not null;

notify pgrst, 'reload schema';
