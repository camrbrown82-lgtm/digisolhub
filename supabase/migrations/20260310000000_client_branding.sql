-- Per-company brand kit used by emails, AI copy, and posters.

alter table public.clients
  add column if not exists branding jsonb not null default '{}'::jsonb;
