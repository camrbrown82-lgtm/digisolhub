-- Carousel series metadata for AI posters.
-- Paste in the Supabase SQL editor if these columns are not on public.assets yet.

alter table public.assets
  add column if not exists series_id uuid;

alter table public.assets
  add column if not exists slide_index integer;

alter table public.assets
  add column if not exists slide_count integer;

create index if not exists assets_series_idx
  on public.assets (series_id, slide_index);
