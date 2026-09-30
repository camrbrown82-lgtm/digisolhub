-- Who a competitive analysis was last emailed to, and when.
alter table public.competitive_analyses
  add column if not exists emailed_to text,
  add column if not exists emailed_at timestamptz;

notify pgrst, 'reload schema';
