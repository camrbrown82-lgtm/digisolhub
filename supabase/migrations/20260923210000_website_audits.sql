-- Website SEO/performance audits for Analytics + Master Agent.

create table if not exists public.website_audits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  url text not null,
  final_url text,
  score integer not null default 0,
  ttfb_ms integer,
  total_ms integer,
  report jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists website_audits_client_created_idx
  on public.website_audits (client_id, created_at desc);

alter table public.website_audits enable row level security;

drop policy if exists "hub website_audits" on public.website_audits;
create policy "hub website_audits" on public.website_audits
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
