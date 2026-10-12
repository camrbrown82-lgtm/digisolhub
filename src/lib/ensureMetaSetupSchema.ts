import pg from "pg";

/** Same SQL as supabase/migrations/20261009000000_meta_setups.sql. */
const META_SETUP_SQL = `
create table if not exists public.meta_setups (
  client_id uuid primary key references public.clients (id) on delete cascade,
  ad_account_id text,
  page_id text,
  instagram_user_id text,
  pixel_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists meta_setups_set_updated_at on public.meta_setups;
create trigger meta_setups_set_updated_at
  before update on public.meta_setups
  for each row execute procedure public.set_updated_at();

alter table public.meta_setups enable row level security;

drop policy if exists "hub meta_setups" on public.meta_setups;
create policy "hub meta_setups" on public.meta_setups
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
`;

let applied = false;

export async function ensureMetaSetupSchema() {
  if (applied) return { ok: true as const };
  const connectionString =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!connectionString) {
    return {
      ok: false as const,
      error: "Run supabase/migrations/20261009000000_meta_setups.sql, or set POSTGRES_URL.",
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
    await client.query(META_SETUP_SQL);
    applied = true;
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Schema ensure failed" };
  } finally {
    await client.end().catch(() => null);
  }
}
