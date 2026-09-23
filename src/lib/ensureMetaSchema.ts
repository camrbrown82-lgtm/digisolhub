import pg from "pg";

const SQL = `
alter table public.contacts
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists fbp text,
  add column if not exists fbc text,
  add column if not exists landing_path text,
  add column if not exists meta_event_id text;

create index if not exists contacts_utm_campaign_idx
  on public.contacts (utm_campaign)
  where utm_campaign is not null;

create index if not exists contacts_campaign_channel_idx
  on public.contacts (campaign_channel)
  where campaign_channel is not null;

create table if not exists public.meta_ads_insights (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text not null,
  campaign_id text not null,
  campaign_name text,
  date_start date,
  date_stop date,
  spend numeric not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  ctr numeric not null default 0,
  cpc numeric not null default 0,
  leads integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (ad_account_id, campaign_id, date_start, date_stop)
);

create index if not exists meta_ads_insights_synced_idx
  on public.meta_ads_insights (synced_at desc);

alter table public.meta_ads_insights enable row level security;

drop policy if exists "hub meta_ads_insights" on public.meta_ads_insights;
create policy "hub meta_ads_insights" on public.meta_ads_insights
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

create table if not exists public.meta_capi_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_id text not null,
  contact_id uuid references public.contacts (id) on delete set null,
  status text not null default 'ok',
  error_message text,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists meta_capi_events_event_id_uidx
  on public.meta_capi_events (event_id);

alter table public.meta_capi_events enable row level security;

drop policy if exists "hub meta_capi_events" on public.meta_capi_events;
create policy "hub meta_capi_events" on public.meta_capi_events
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
`;

let applied = false;

export async function ensureMetaSchema(options?: { force?: boolean }) {
  if (applied && !options?.force) {
    return { ok: true as const, skipped: true as const };
  }
  const connectionString =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!connectionString) {
    return { ok: false as const, error: "POSTGRES_URL is not set" };
  }

  const cleaned = connectionString
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
  const client = new pg.Client({
    connectionString: cleaned,
    connectionTimeoutMillis: 4000,
    query_timeout: 8000,
    ssl: cleaned.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });
  try {
    await Promise.race([
      (async () => {
        await client.connect();
        await client.query(SQL);
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Meta schema ensure timed out")), 10000),
      ),
    ]);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } catch (error) {
    applied = false;
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Meta schema ensure failed",
    };
  } finally {
    await client.end().catch(() => null);
  }
}
