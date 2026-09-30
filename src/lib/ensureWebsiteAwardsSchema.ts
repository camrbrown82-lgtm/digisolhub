import pg from "pg";

const WEBSITE_AWARDS_SQL = `
create table if not exists public.website_awards (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  target_url text not null,
  audit_score int not null,
  award_category text default 'DigiSol Excellence Award',
  badge_image_url text,
  is_claimed boolean default false,
  created_at timestamptz default now()
);

alter table public.website_awards
  add column if not exists source text not null default 'hub',
  add column if not exists prospect_id uuid references public.prospects (id) on delete set null,
  add column if not exists audit_id uuid references public.website_audits (id) on delete set null,
  add column if not exists client_id uuid references public.clients (id) on delete set null,
  add column if not exists contact_id uuid references public.contacts (id) on delete set null,
  add column if not exists site_host text,
  add column if not exists sent_to text,
  add column if not exists sent_at timestamptz,
  add column if not exists add_page_viewed_at timestamptz,
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_from text,
  add column if not exists featured boolean not null default false,
  add column if not exists help_emailed_at timestamptz,
  add column if not exists live_emailed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.website_awards alter column award_category set default 'DigiSol Excellence Award';
update public.website_awards
  set award_category = 'DigiSol Excellence Award'
  where award_category is null or award_category = 'Web Dynamics Excellence';

create index if not exists website_awards_created_idx on public.website_awards (created_at desc);
create index if not exists website_awards_site_host_idx on public.website_awards (site_host);

drop trigger if exists website_awards_set_updated_at on public.website_awards;
create trigger website_awards_set_updated_at
  before update on public.website_awards
  for each row execute procedure public.set_updated_at();

alter table public.website_awards enable row level security;

drop policy if exists "hub website_awards" on public.website_awards;
create policy "hub website_awards" on public.website_awards
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

notify pgrst, 'reload schema';
`;

let applied = false;

export async function ensureWebsiteAwardsSchema() {
  if (applied) return { ok: true as const, skipped: true as const };
  const connectionString =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!connectionString) {
    return { ok: false as const, error: "POSTGRES_URL is not set, so the website_awards columns can't be added." };
  }

  // pg v8.16+ treats sslmode=require as verify-full, which rejects Supabase pooler certs.
  const cleaned = connectionString
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
  const client = new pg.Client({
    connectionString: cleaned,
    connectionTimeoutMillis: 4000,
    query_timeout: 8000,
    ssl: cleaned.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  try {
    await Promise.race([
      (async () => {
        await client.connect();
        await client.query(WEBSITE_AWARDS_SQL);
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Website awards schema ensure timed out")), 10000),
      ),
    ]);
    applied = true;
    return { ok: true as const, skipped: false as const };
  } catch (error) {
    applied = false;
    return { ok: false as const, error: error instanceof Error ? error.message : "Schema ensure failed" };
  } finally {
    await client.end().catch(() => null);
  }
}
