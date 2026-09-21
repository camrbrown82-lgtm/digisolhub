import pg from "pg";

const SQL = `
alter table public.contacts
  add column if not exists campaign_channel text;

alter table public.contacts
  add column if not exists ab_variant text;

create index if not exists contacts_campaign_channel_idx
  on public.contacts (campaign_channel);

create index if not exists contacts_ab_variant_idx
  on public.contacts (ab_variant);

alter table public.contacts
  drop constraint if exists contacts_campaign_channel_check;

alter table public.contacts
  add constraint contacts_campaign_channel_check
  check (
    campaign_channel is null
    or campaign_channel in ('email', 'cold_call', 'door_to_door')
  );

alter table public.contacts
  drop constraint if exists contacts_ab_variant_check;

alter table public.contacts
  add constraint contacts_ab_variant_check
  check (
    ab_variant is null
    or ab_variant in ('A', 'B')
  );
`;

let applied = false;

export async function ensureCampaignChannelSchema() {
  if (applied) return { ok: true as const, skipped: true as const };
  const connectionString =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!connectionString) {
    return { ok: false as const, error: "POSTGRES_URL is not set" };
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
