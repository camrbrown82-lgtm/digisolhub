-- Allow 5-variant social campaigns (Facebook group multi-hook packs).
alter table public.social_posts
  drop constraint if exists social_posts_variant_check;

alter table public.social_posts
  add constraint social_posts_variant_check
  check (variant in ('A', 'B', '1', '2', '3', '4', '5'));

notify pgrst, 'reload schema';
