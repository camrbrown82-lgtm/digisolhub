import pg from "pg";

/** Same SQL as supabase/migrations/20261001000000_google_setup.sql. */
const GOOGLE_SETUP_SQL = `
create table if not exists public.google_setups (
  client_id uuid primary key references public.clients (id) on delete cascade,
  ga4_property_id text,
  search_console_site text,
  ads_customer_id text,
  audit jsonb,
  previous_audit jsonb,
  audited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists google_setups_set_updated_at on public.google_setups;
create trigger google_setups_set_updated_at
  before update on public.google_setups
  for each row execute procedure public.set_updated_at();

alter table public.google_setups enable row level security;

drop policy if exists "hub google_setups" on public.google_setups;
create policy "hub google_setups" on public.google_setups
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

create table if not exists public.google_fix_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  check_id text not null,
  fix_kind text,
  title text,
  ok boolean not null default false,
  detail text,
  applied_by text,
  created_at timestamptz not null default now()
);

create index if not exists google_fix_log_client_idx
  on public.google_fix_log (client_id, created_at desc);

alter table public.google_fix_log enable row level security;

drop policy if exists "hub google_fix_log" on public.google_fix_log;
create policy "hub google_fix_log" on public.google_fix_log
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
`;

let applied = false;

export async function ensureGoogleSetupSchema() {
  if (applied) return { ok: true as const };
  const connectionString =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!connectionString) {
    return {
      ok: false as const,
      error: "Run supabase/migrations/20261001000000_google_setup.sql, or set POSTGRES_URL.",
    };
  }
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 4000,
    query_timeout: 8000,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(GOOGLE_SETUP_SQL);
    applied = true;
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Schema ensure failed" };
  } finally {
    await client.end().catch(() => null);
  }
}
