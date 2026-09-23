-- DigiSol bootstrap: calendar-day counters for automated prospecting (hard cap 5).

create table if not exists public.digisol_daily_usage (
  day_key date primary key,
  client_id uuid references public.clients (id) on delete set null,
  audits_used integer not null default 0,
  emails_used integer not null default 0,
  tokens_used integer not null default 0,
  tool_calls_used integer not null default 0,
  blocked boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists digisol_daily_usage_client_day_idx
  on public.digisol_daily_usage (client_id, day_key desc);

drop trigger if exists digisol_daily_usage_set_updated_at on public.digisol_daily_usage;
create trigger digisol_daily_usage_set_updated_at
  before update on public.digisol_daily_usage
  for each row execute procedure public.set_updated_at();

alter table public.digisol_daily_usage enable row level security;

drop policy if exists "hub digisol_daily_usage" on public.digisol_daily_usage;
create policy "hub digisol_daily_usage" on public.digisol_daily_usage
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
