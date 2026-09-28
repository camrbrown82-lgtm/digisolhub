-- Google Business Profile rating + review tracking per company (Places API).
alter table public.clients add column if not exists google_place_id text;

create table if not exists public.google_review_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  place_id text not null,
  place_name text,
  rating numeric(2, 1),
  review_count integer,
  reviews jsonb not null default '[]'::jsonb,
  maps_url text,
  captured_on date not null default ((now() at time zone 'America/Edmonton')::date),
  captured_at timestamptz not null default now(),
  constraint google_review_snapshots_day unique (client_id, captured_on)
);

create index if not exists google_review_snapshots_client_idx
  on public.google_review_snapshots (client_id, captured_on desc);

alter table public.google_review_snapshots enable row level security;

drop policy if exists "hub google_review_snapshots" on public.google_review_snapshots;
create policy "hub google_review_snapshots" on public.google_review_snapshots
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
