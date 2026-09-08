-- File kinds for per-company images, data sheets, and related files.

alter table public.assets
  add column if not exists kind text not null default 'related';

alter table public.assets
  add column if not exists byte_size bigint;

alter table public.assets
  add column if not exists notes text;

update public.assets
set kind = 'image'
where coalesce(mime_type, '') like 'image/%'
  and kind = 'related';

update public.assets
set kind = 'datasheet'
where kind = 'related'
  and (
    lower(coalesce(filename, '')) ~ '\.(pdf|csv|tsv|xls|xlsx|ods)$'
    or coalesce(mime_type, '') in (
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  );

create index if not exists assets_kind_idx on public.assets (kind);
create index if not exists assets_client_kind_idx on public.assets (client_id, kind);
