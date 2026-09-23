import pg from "pg";

const SQL = `
create table if not exists public.digisol_daily_usage (
  day_key date primary key,
  client_id uuid references public.clients (id) on delete set null,
  audits_used integer not null default 0,
  emails_used integer not null default 0,
  tokens_used integer not null default 0,
  tool_calls_used integer not null default 0,
  blocked boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists digisol_daily_usage_client_day_idx
  on public.digisol_daily_usage (client_id, day_key desc);

drop trigger if exists digisol_daily_usage_set_updated_at on public.digisol_daily_usage;
create trigger digisol_daily_usage_set_updated_at
  before update on public.digisol_daily_usage
  for each row execute procedure public.set_updated_at();

alter table public.digisol_daily_usage enable row level security;

drop policy if exists "hub digisol_daily_usage" on public.digisol_daily_usage;
create policy "hub digisol_daily_usage" on public.digisol_daily_usage
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
`;

let applied = false;

export async function ensureDigisolDailyUsageSchema() {
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
        "POSTGRES_URL is not set. Run supabase/migrations for digisol_daily_usage, or set POSTGRES_URL.",
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
    await client.query(SQL);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } finally {
    await client.end();
  }
}
