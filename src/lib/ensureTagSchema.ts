import pg from "pg";

const TAG_DESCRIPTION_SQL = `
alter table public.tags
  add column if not exists description text;

create index if not exists tags_name_lower_idx
  on public.tags (lower(name));
`;

let applied = false;

export async function ensureTagDescriptionSchema() {
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
    await client.query(TAG_DESCRIPTION_SQL);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } finally {
    await client.end();
  }
}
