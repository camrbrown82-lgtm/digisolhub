-- A/B tests for any campaign content: social posts, ads, posters, emails, files.
-- Each variant gets a UTM-tagged tracking link per channel so GA4 and leads
-- attribute visits back to the variant (utm_campaign = slug, utm_content = a|b).

create table if not exists public.content_tests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  name text not null,
  slug text not null,
  goal text,
  hypothesis text,
  landing_url text not null,
  channels text[] not null default '{}',
  status text not null default 'live',
  winner_variant text,
  source jsonb not null default '{}'::jsonb,
  kaylev jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_tests_status_check check (status in ('draft', 'live', 'completed')),
  constraint content_tests_winner_check check (winner_variant is null or winner_variant in ('A', 'B'))
);

create unique index if not exists content_tests_client_slug_idx
  on public.content_tests (client_id, slug);

create table if not exists public.content_test_variants (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.content_tests (id) on delete cascade,
  variant text not null,
  label text,
  body text,
  asset_id uuid references public.assets (id) on delete set null,
  email_template_id uuid references public.email_templates (id) on delete set null,
  media_url text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_test_variants_variant_check check (variant in ('A', 'B')),
  constraint content_test_variants_unique unique (test_id, variant)
);

alter table public.social_posts add column if not exists test_id uuid
  references public.content_tests (id) on delete set null;

drop trigger if exists content_tests_set_updated_at on public.content_tests;
create trigger content_tests_set_updated_at
  before update on public.content_tests
  for each row execute procedure public.set_updated_at();

drop trigger if exists content_test_variants_set_updated_at on public.content_test_variants;
create trigger content_test_variants_set_updated_at
  before update on public.content_test_variants
  for each row execute procedure public.set_updated_at();

alter table public.content_tests enable row level security;
alter table public.content_test_variants enable row level security;

drop policy if exists "hub content_tests" on public.content_tests;
create policy "hub content_tests" on public.content_tests
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub content_test_variants" on public.content_test_variants;
create policy "hub content_test_variants" on public.content_test_variants
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
