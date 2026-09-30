import pg from "pg";

const COMPETITIVE_SQL = `
create table if not exists public.competitive_analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  status text not null default 'queued',
  stage text,
  inputs jsonb not null default '{}'::jsonb,
  result jsonb,
  sources jsonb not null default '{}'::jsonb,
  error text,
  model text,
  tokens_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.competitive_analyses
  add column if not exists emailed_to text,
  add column if not exists emailed_at timestamptz;

create index if not exists competitive_analyses_client_created_idx
  on public.competitive_analyses (client_id, created_at desc);

drop trigger if exists competitive_analyses_set_updated_at on public.competitive_analyses;
create trigger competitive_analyses_set_updated_at
  before update on public.competitive_analyses
  for each row execute procedure public.set_updated_at();

alter table public.competitive_analyses enable row level security;

drop policy if exists "hub competitive_analyses" on public.competitive_analyses;
create policy "hub competitive_analyses" on public.competitive_analyses
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
`;

let applied = false;

export async function ensureCompetitiveSchema() {
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
        "POSTGRES_URL is not set. Run supabase/migrations/20260928000000_competitive_analyses.sql, or set POSTGRES_URL.",
    };
  }

  // pg v8.16+ treats sslmode=require as verify-full, which rejects Supabase pooler certs.
  const cleaned = connectionString
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
  const client = new pg.Client({
    connectionString: cleaned,
    connectionTimeoutMillis: 4000,
    query_timeout: 8000,
    ssl: cleaned.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  try {
    await Promise.race([
      (async () => {
        await client.connect();
        await client.query(COMPETITIVE_SQL);
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Competitive schema ensure timed out")), 10000),
      ),
    ]);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } catch (error) {
    applied = false;
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Schema ensure failed",
    };
  } finally {
    await client.end().catch(() => null);
  }
}
