-- Poster captions and social export packs.
-- Paste in the Supabase SQL editor if these columns are not on public.assets yet.

alter table public.assets
  add column if not exists prompt text;

alter table public.assets
  add column if not exists caption text;

alter table public.assets
  add column if not exists social_pack jsonb not null default '{}'::jsonb;

create index if not exists assets_bucket_client_created_idx
  on public.assets (bucket, client_id, created_at desc);
