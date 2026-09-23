import { spawnSync } from "child_process";
import fs from "fs";
import pg from "pg";

function vercelEnv(name) {
  const result = spawnSync(
    "npx",
    ["vercel", "env", "get", name, "production"],
    { encoding: "utf8", shell: true },
  );
  const text = `${result.stdout || ""}${result.stderr || ""}`.trim();
  // CLI may print warnings; take the last non-empty line that looks like a URL/value
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("Vercel") && !line.startsWith(">") && !line.startsWith("Retrieving") && !line.startsWith("npm "));
  const value = lines.at(-1) || "";
  if (!value || value.includes("[SENSITIVE]") || value.toLowerCase().includes("error")) {
    return "";
  }
  return value.replace(/^["']|["']$/g, "");
}

const connectionString =
  vercelEnv("POSTGRES_URL_NON_POOLING") ||
  vercelEnv("POSTGRES_URL") ||
  "";

if (!connectionString) {
  console.error("NO_DB_URL_FROM_VERCEL");
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
