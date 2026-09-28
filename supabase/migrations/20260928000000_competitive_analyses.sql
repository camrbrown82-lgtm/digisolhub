create table if not exists public.competitive_analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  status text not null default 'queued',
  stage text,
  inputs jsonb not null default '{}'::jsonb,
  result jsonb,
  sources jsonb not null default '{}'::jsonb,
  error text,
  model text,
  tokens_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists competitive_analyses_client_created_idx
  on public.competitive_analyses (client_id, created_at desc);

drop trigger if exists competitive_analyses_set_updated_at on public.competitive_analyses;
create trigger competitive_analyses_set_updated_at
  before update on public.competitive_analyses
  for each row execute procedure public.set_updated_at();

alter table public.competitive_analyses enable row level security;

drop policy if exists "hub competitive_analyses" on public.competitive_analyses;
create policy "hub competitive_analyses" on public.competitive_analyses
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
