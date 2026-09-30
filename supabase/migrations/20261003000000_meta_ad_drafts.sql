-- Ads robot: campaign drafts written in the Hub and created (paused) in Meta Ads.
-- Also applied at runtime by ensureMetaSchema.

create table if not exists public.meta_ad_drafts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  status text not null default 'draft',
  brief text not null default '',
  name text not null default '',
  objective text not null default 'OUTCOME_LEADS',
  daily_budget numeric not null default 20,
  headline text not null default '',
  primary_text text not null default '',
  description text not null default '',
  cta text not null default 'LEARN_MORE',
  link_url text not null default '',
  poster_url text,
  locations text[] not null default '{}',
  age_min integer not null default 25,
  age_max integer not null default 65,
  meta_campaign_id text,
  meta_adset_id text,
  meta_creative_id text,
  meta_ad_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  launched_at timestamptz
);

create index if not exists meta_ad_drafts_client_created_idx
  on public.meta_ad_drafts (client_id, created_at desc);

alter table public.meta_ad_drafts enable row level security;

drop policy if exists "hub meta_ad_drafts" on public.meta_ad_drafts;
create policy "hub meta_ad_drafts" on public.meta_ad_drafts
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
