-- Unified agent/product telemetry + social campaign queue.
-- Expands contacts.campaign_channel for Meta/LinkedIn posting.

-- 1) analytics_events — standardized action telemetry for Hub Performance charts
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.clients (id) on delete set null,
  event_type text not null,
  channel text,
  success boolean not null default true,
  token_cost integer not null default 0,
  contact_id uuid references public.contacts (id) on delete set null,
  campaign_id uuid,
  visitor_id text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_company_created_idx
  on public.analytics_events (company_id, created_at desc);

create index if not exists analytics_events_type_created_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_channel_idx
  on public.analytics_events (channel)
  where channel is not null;

alter table public.analytics_events enable row level security;

drop policy if exists "hub analytics_events" on public.analytics_events;
create policy "hub analytics_events" on public.analytics_events
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

-- Service role / edge inserts (visitor chat, crons) bypass RLS.

-- 2) Expand campaign channels (email + field + social)
alter table public.contacts
  drop constraint if exists contacts_campaign_channel_check;

alter table public.contacts
  add constraint contacts_campaign_channel_check
  check (
    campaign_channel is null
    or campaign_channel in (
      'email',
      'cold_call',
      'door_to_door',
      'facebook',
      'instagram',
      'linkedin'
    )
  );

-- 3) Social auto-post queue (Variant A/B + Meta/LinkedIn)
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  campaign_id uuid,
  channel text not null
    check (channel in ('facebook', 'instagram', 'linkedin')),
  variant text not null default 'A'
    check (variant in ('A', 'B')),
  body text not null,
  media_url text,
  media_path text,
  status text not null default 'queued'
    check (status in ('draft', 'queued', 'publishing', 'published', 'failed', 'cancelled')),
  external_id text,
  external_url text,
  error_message text,
  token_cost integer not null default 0,
  scheduled_at timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_queue_idx
  on public.social_posts (status, scheduled_at nulls first, created_at);

create index if not exists social_posts_client_idx
  on public.social_posts (client_id, created_at desc);

drop trigger if exists social_posts_set_updated_at on public.social_posts;
create trigger social_posts_set_updated_at
  before update on public.social_posts
  for each row execute procedure public.set_updated_at();

alter table public.social_posts enable row level security;

drop policy if exists "hub social_posts" on public.social_posts;
create policy "hub social_posts" on public.social_posts
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
