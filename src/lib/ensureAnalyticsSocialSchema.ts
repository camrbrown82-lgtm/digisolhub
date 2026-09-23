import pg from "pg";

const SQL = `
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.clients (id) on delete set null,
  event_type text not null,
  channel text,
  success boolean not null default true,
  token_cost integer not null default 0,
  contact_id uuid references public.contacts (id) on delete set null,
  campaign_id uuid,
  visitor_id text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_company_created_idx
  on public.analytics_events (company_id, created_at desc);

create index if not exists analytics_events_type_created_idx
  on public.analytics_events (event_type, created_at desc);

alter table public.analytics_events enable row level security;

drop policy if exists "hub analytics_events" on public.analytics_events;
create policy "hub analytics_events" on public.analytics_events
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  campaign_id uuid,
  channel text not null,
  variant text not null default 'A',
  body text not null,
  media_url text,
  media_path text,
  status text not null default 'queued',
  external_id text,
  external_url text,
  error_message text,
  token_cost integer not null default 0,
  scheduled_at timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_queue_idx
  on public.social_posts (status, scheduled_at nulls first, created_at);

alter table public.social_posts enable row level security;

drop policy if exists "hub social_posts" on public.social_posts;
create policy "hub social_posts" on public.social_posts
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

alter table public.contacts
  drop constraint if exists contacts_campaign_channel_check;

alter table public.contacts
  add constraint contacts_campaign_channel_check
  check (
    campaign_channel is null
    or campaign_channel in (
      'email',
      'cold_call',
      'door_to_door',
      'facebook',
      'instagram',
      'linkedin'
    )
  );

notify pgrst, 'reload schema';
`;

let applied = false;

export async function ensureAnalyticsSocialSchema(options?: { force?: boolean }) {
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
    ssl: cleaned.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(SQL);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } catch (error) {
    applied = false;
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Schema ensure failed",
    };
  } finally {
    await client.end();
  }
}
