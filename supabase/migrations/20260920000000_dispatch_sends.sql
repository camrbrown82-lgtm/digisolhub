-- DigiSol Dispatch newsletter: per-contact send log so monthly issues are emailed once.
create table if not exists public.dispatch_sends (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  slug text not null,
  status text not null default 'sent',
  campaign_id uuid references public.campaigns (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (contact_id, slug)
);

create index if not exists dispatch_sends_slug_idx on public.dispatch_sends (slug);
create index if not exists dispatch_sends_contact_id_idx on public.dispatch_sends (contact_id);

alter table public.dispatch_sends enable row level security;

drop policy if exists "hub dispatch_sends" on public.dispatch_sends;
create policy "hub dispatch_sends" on public.dispatch_sends
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
