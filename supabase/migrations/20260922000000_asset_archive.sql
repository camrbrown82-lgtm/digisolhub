-- Archive poster generations (and other assets) per company.
-- Also coerce assets.prompt to text if it was created as jsonb.

alter table public.assets
  add column if not exists archived_at timestamptz;

create index if not exists assets_client_archived_idx
  on public.assets (client_id, archived_at, created_at desc);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'prompt'
      and data_type = 'jsonb'
  ) then
    alter table public.assets
      alter column prompt type text using prompt::text;
  end if;
end $$;
