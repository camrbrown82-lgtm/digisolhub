-- Per-company Meta link: the ad account, Facebook Page, and Instagram this Hub
-- posts and advertises on. The system-user token stays in Vercel.
create table if not exists public.meta_setups (
  client_id uuid primary key references public.clients (id) on delete cascade,
  ad_account_id text,
  page_id text,
  instagram_user_id text,
  pixel_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists meta_setups_set_updated_at on public.meta_setups;
create trigger meta_setups_set_updated_at
  before update on public.meta_setups
  for each row execute procedure public.set_updated_at();

alter table public.meta_setups enable row level security;

drop policy if exists "hub meta_setups" on public.meta_setups;
create policy "hub meta_setups" on public.meta_setups
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
