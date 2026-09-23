import pg from "pg";

const CAMPAIGN_AB_SQL = `
alter table public.campaigns
  add column if not exists is_ab boolean not null default false,
  add column if not exists industry text,
  add column if not exists template_b_id uuid references public.email_templates (id) on delete set null,
  add column if not exists ab_split integer not null default 50,
  add column if not exists winner_variant text,
  add column if not exists notes text;

alter table public.sends
  add column if not exists variant text;

create index if not exists sends_campaign_variant_idx
  on public.sends (campaign_id, variant);

create table if not exists public.campaign_audits (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  period text not null default 'week',
  note text not null default '',
  winner_pick text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint campaign_audits_period_check check (period in ('day', 'week', 'month')),
  constraint campaign_audits_winner_check check (
    winner_pick is null or winner_pick in ('A', 'B')
  )
);

create index if not exists campaign_audits_campaign_id_idx
  on public.campaign_audits (campaign_id, created_at desc);

alter table public.campaign_audits enable row level security;

drop policy if exists "hub campaign_audits" on public.campaign_audits;
create policy "hub campaign_audits" on public.campaign_audits
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
`;

let applied = false;

/** Apply campaign A/B migration once when POSTGRES_URL is available (e.g. on Vercel). */
export async function ensureCampaignAbSchema(options?: { force?: boolean }) {
  if (applied && !options?.force) {
    return { ok: true as const, skipped: true as const };
  }
  const connectionString =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!connectionString) {
    return {
      ok: false as const,
      error:
        "POSTGRES_URL is not set. Run supabase/migrations/20260923100000_campaign_ab.sql in the Supabase SQL editor.",
    };
  }

  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 4000,
    query_timeout: 8000,
    ssl: connectionString.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });

  try {
    await Promise.race([
      (async () => {
        await client.connect();
        await client.query(CAMPAIGN_AB_SQL);
        // Force PostgREST to pick up new columns (avoids "schema cache" errors).
        await client.query(`notify pgrst, 'reload schema'`);
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Schema ensure timed out")), 10000),
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
