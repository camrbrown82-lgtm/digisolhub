import pg from "pg";

const AGENT_ACTIVITY_LOGS_SQL = `
create table if not exists public.agent_activity_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  user_id uuid,
  operator text not null default 'DigiSol',
  action text not null,
  tool_name text,
  status text not null default 'ok',
  model text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_activity_logs_client_created_idx
  on public.agent_activity_logs (client_id, created_at desc);

create index if not exists agent_activity_logs_tool_created_idx
  on public.agent_activity_logs (tool_name, created_at desc);

alter table public.agent_activity_logs enable row level security;

drop policy if exists "hub agent_activity_logs" on public.agent_activity_logs;
create policy "hub agent_activity_logs" on public.agent_activity_logs
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
`;

let applied = false;

export async function ensureAgentActivityLogSchema() {
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
        "POSTGRES_URL is not set. Run supabase/migrations for agent_activity_logs, or set POSTGRES_URL.",
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
    await client.query(AGENT_ACTIVITY_LOGS_SQL);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } finally {
    await client.end();
  }
}
