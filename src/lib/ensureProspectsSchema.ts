import pg from "pg";

const PROSPECTS_SQL = `
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  business_name text,
  url text not null,
  trade text not null default 'general',
  city text,
  region text default 'AB',
  contact_email text,
  contact_name text,
  casl_status text not null default 'pending',
  casl_basis text,
  casl_evidence jsonb not null default '{}'::jsonb,
  audit_status text not null default 'pending',
  audit_score integer,
  audit_summary text,
  audit_report jsonb not null default '{}'::jsonb,
  tokens_prompt integer not null default 0,
  tokens_completion integer not null default 0,
  tokens_total integer not null default 0,
  last_audited_at timestamptz,
  emailed_at timestamptz,
  engaged_at timestamptz,
  promoted_at timestamptz,
  contact_id uuid references public.contacts (id) on delete set null,
  send_id uuid references public.sends (id) on delete set null,
  resend_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospects_client_status_idx
  on public.prospects (client_id, audit_status, created_at);

create index if not exists prospects_trade_status_idx
  on public.prospects (trade, audit_status);

create index if not exists prospects_resend_id_idx
  on public.prospects (resend_id);

create index if not exists prospects_audited_day_idx
  on public.prospects (last_audited_at desc);

drop trigger if exists prospects_set_updated_at on public.prospects;
create trigger prospects_set_updated_at
  before update on public.prospects
  for each row execute procedure public.set_updated_at();

alter table public.prospects enable row level security;

drop policy if exists "hub prospects" on public.prospects;
create policy "hub prospects" on public.prospects
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
`;

let applied = false;

export async function ensureProspectsSchema() {
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
        "POSTGRES_URL is not set. Run supabase/migrations for prospects, or set POSTGRES_URL.",
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
    await client.query(PROSPECTS_SQL);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } finally {
    await client.end();
  }
}
