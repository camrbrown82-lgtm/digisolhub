-- Campaign A/B testing: two email variants, send-level variant, audit log.

alter table public.campaigns
  add column if not exists is_ab boolean not null default false,
  add column if not exists industry text,
  add column if not exists template_b_id uuid references public.email_templates (id) on delete set null,
  add column if not exists ab_split integer not null default 50,
  add column if not exists winner_variant text,
  add column if not exists notes text;

alter table public.sends
  add column if not exists variant text;

create index if not exists sends_campaign_variant_idx
  on public.sends (campaign_id, variant);

create table if not exists public.campaign_audits (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  period text not null default 'week',
  note text not null default '',
  winner_pick text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint campaign_audits_period_check check (period in ('day', 'week', 'month')),
  constraint campaign_audits_winner_check check (
    winner_pick is null or winner_pick in ('A', 'B')
  )
);

create index if not exists campaign_audits_campaign_id_idx
  on public.campaign_audits (campaign_id, created_at desc);

alter table public.campaign_audits enable row level security;

drop policy if exists "hub campaign_audits" on public.campaign_audits;
create policy "hub campaign_audits" on public.campaign_audits
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
