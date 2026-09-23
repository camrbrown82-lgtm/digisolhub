import fs from "fs";
import pg from "pg";

function loadEnvLocal() {
  const text = fs.readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(POSTGRES_URL(?:_NON_POOLING)?|DATABASE_URL)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

loadEnvLocal();

const connectionString = (
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  ""
).trim();

if (!connectionString) {
  console.error("NO_DB_URL");
  process.exit(1);
}

const sql = fs.readFileSync(
  "supabase/migrations/20260923210000_website_audits.sql",
  "utf8",
);

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("localhost")
    ? undefined
    : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  const check = await client.query(
    "select to_regclass('public.website_audits') as table_name",
  );
  console.log("MIGRATION_OK", check.rows[0]?.table_name);
} finally {
  await client.end();
}
