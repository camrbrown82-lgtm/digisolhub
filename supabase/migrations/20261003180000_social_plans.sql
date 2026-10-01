-- Weekly social plans approved in Campaigns, then posted and advertised by the Meta robot.
-- Also applied at runtime by ensureAnalyticsSocialSchema.

create table if not exists public.social_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  status text not null default 'draft',
  brief text not null default '',
  weekly_budget numeric not null default 0,
  summary text not null default '',
  why text not null default '',
  items jsonb not null default '[]'::jsonb,
  ad_draft_id uuid,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists social_plans_client_created_idx
  on public.social_plans (client_id, created_at desc);

alter table public.social_plans enable row level security;

drop policy if exists "hub social_plans" on public.social_plans;
create policy "hub social_plans" on public.social_plans
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
