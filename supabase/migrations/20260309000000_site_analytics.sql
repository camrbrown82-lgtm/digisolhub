-- First-party website analytics for each client company.

alter table public.clients
  add column if not exists site_key text unique;

update public.clients
set site_key = encode(gen_random_bytes(12), 'hex')
where site_key is null;

alter table public.clients
  alter column site_key set default encode(gen_random_bytes(12), 'hex');

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  visitor_id text,
  host text,
  path text,
  title text,
  referrer text,
  locale text,
  created_at timestamptz not null default now()
);

create index if not exists site_events_client_created_idx
  on public.site_events (client_id, created_at desc);
create index if not exists site_events_visitor_idx
  on public.site_events (client_id, visitor_id);

alter table public.site_events enable row level security;

drop policy if exists "hub site_events read" on public.site_events;
create policy "hub site_events read" on public.site_events
  for select to authenticated
  using (public.is_hub_user());
