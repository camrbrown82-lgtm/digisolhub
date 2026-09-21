-- Tag descriptions for AI-generated / Hub CRM tags.

alter table public.tags
  add column if not exists description text;

create index if not exists tags_name_lower_idx
  on public.tags (lower(name));
