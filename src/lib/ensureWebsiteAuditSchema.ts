import pg from "pg";

const WEBSITE_AUDIT_SQL = `
create table if not exists public.website_audits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  url text not null,
  final_url text,
  score integer not null default 0,
  ttfb_ms integer,
  total_ms integer,
  report jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists website_audits_client_created_idx
  on public.website_audits (client_id, created_at desc);

alter table public.website_audits enable row level security;

drop policy if exists "hub website_audits" on public.website_audits;
create policy "hub website_audits" on public.website_audits
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
`;

let applied = false;

export async function ensureWebsiteAuditSchema() {
  if (applied) return { ok: true as const, skipped: true as const };
  const connectionString =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!connectionString) {
    return {
      ok: false as const,
      error:
        "POSTGRES_URL is not set. Run supabase/migrations for website_audits, or set POSTGRES_URL.",
    };
  }

  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(WEBSITE_AUDIT_SQL);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } finally {
    await client.end();
  }
}
