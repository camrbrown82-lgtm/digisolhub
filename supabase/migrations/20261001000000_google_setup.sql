-- Per-company Google setup: linked GA4 / Search Console / Google Ads IDs, the latest
-- audit, and a log of one-click fixes applied from the Hub.
create table if not exists public.google_setups (
  client_id uuid primary key references public.clients (id) on delete cascade,
  ga4_property_id text,
  search_console_site text,
  ads_customer_id text,
  audit jsonb,
  previous_audit jsonb,
  audited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists google_setups_set_updated_at on public.google_setups;
create trigger google_setups_set_updated_at
  before update on public.google_setups
  for each row execute procedure public.set_updated_at();

alter table public.google_setups enable row level security;

drop policy if exists "hub google_setups" on public.google_setups;
create policy "hub google_setups" on public.google_setups
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

create table if not exists public.google_fix_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  check_id text not null,
  fix_kind text,
  title text,
  ok boolean not null default false,
  detail text,
  applied_by text,
  created_at timestamptz not null default now()
);

create index if not exists google_fix_log_client_idx
  on public.google_fix_log (client_id, created_at desc);

alter table public.google_fix_log enable row level security;

drop policy if exists "hub google_fix_log" on public.google_fix_log;
create policy "hub google_fix_log" on public.google_fix_log
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
