import pg from "pg";

const SQL = `
create table if not exists public.client_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  pricing_item_id text not null,
  status text not null default 'active',
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_subscriptions_client_status_idx
  on public.client_subscriptions (client_id, status);

create index if not exists client_subscriptions_pricing_idx
  on public.client_subscriptions (pricing_item_id);

drop trigger if exists client_subscriptions_set_updated_at on public.client_subscriptions;
create trigger client_subscriptions_set_updated_at
  before update on public.client_subscriptions
  for each row execute procedure public.set_updated_at();

create table if not exists public.client_ai_wallets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  is_internal boolean not null default false,
  pricing_item_ids text[] not null default '{}',
  token_budget integer not null default 0,
  token_used integer not null default 0,
  tool_call_budget integer not null default 0,
  tool_calls_used integer not null default 0,
  audit_budget integer not null default 0,
  audits_used integer not null default 0,
  email_dispatch_budget integer not null default 0,
  emails_dispatched integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, period_start)
);

create index if not exists client_ai_wallets_client_period_idx
  on public.client_ai_wallets (client_id, period_start desc);

drop trigger if exists client_ai_wallets_set_updated_at on public.client_ai_wallets;
create trigger client_ai_wallets_set_updated_at
  before update on public.client_ai_wallets
  for each row execute procedure public.set_updated_at();

alter table public.client_subscriptions enable row level security;
alter table public.client_ai_wallets enable row level security;

drop policy if exists "hub client_subscriptions" on public.client_subscriptions;
create policy "hub client_subscriptions" on public.client_subscriptions
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub client_ai_wallets" on public.client_ai_wallets;
create policy "hub client_ai_wallets" on public.client_ai_wallets
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
`;

let applied = false;

export async function ensureClientAiWalletSchema() {
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
        "POSTGRES_URL is not set. Run supabase/migrations for client_ai_wallets, or set POSTGRES_URL.",
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
