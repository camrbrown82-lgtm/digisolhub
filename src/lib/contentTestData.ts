import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeVariantResults,
  leadingVariant,
  type ContentTestRow,
  type ContentVariantRow,
  type LeadRow,
  type SocialPostRow,
  type VariantResult,
} from "@/lib/contentTests";
import { fetchGa4ContentTestStats } from "@/lib/ga4";

export type LoadedContentTest = {
  test: ContentTestRow;
  variants: (ContentVariantRow & {
    asset: { filename: string | null; public_url: string | null; mime_type: string | null } | null;
    templateName: string | null;
  })[];
  results: VariantResult[];
  leader: ReturnType<typeof leadingVariant>;
};

export type ContentTestLoad = {
  tests: LoadedContentTest[];
  gaConfigured: boolean;
  gaError?: string;
  error?: string;
};

/** Tests for one company. GA4 visits only count for DigiSol's own property. */
export async function loadContentTests(
  supabase: SupabaseClient,
  clientId: string | null,
  opts: { useGa4: boolean; limit?: number },
): Promise<ContentTestLoad> {
  let query = supabase
    .from("content_tests")
    .select(
      "id, client_id, name, slug, goal, hypothesis, landing_url, channels, status, winner_variant, source, kaylev, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 12);
  if (clientId) query = query.eq("client_id", clientId);
  const { data: testRows, error } = await query;
  if (error) return { tests: [], gaConfigured: false, error: error.message };
  const tests = (testRows ?? []) as ContentTestRow[];
  if (tests.length === 0) return { tests: [], gaConfigured: opts.useGa4 };

  const ids = tests.map((row) => row.id);
  const slugs = tests.map((row) => row.slug);
  const [variantsRes, postsRes, leadsRes, ga] = await Promise.all([
    supabase
      .from("content_test_variants")
      .select("id, test_id, variant, label, body, asset_id, email_template_id, media_url, metrics")
      .in("test_id", ids),
    supabase
      .from("social_posts")
      .select("id, test_id, channel, variant, status, external_url, error_message, published_at")
      .in("test_id", ids)
      .order("created_at", { ascending: false }),
    (() => {
      let leads = supabase
        .from("contacts")
        .select("utm_campaign, utm_content, utm_source, utm_medium")
        .in("utm_campaign", slugs)
        .limit(2000);
      if (clientId) leads = leads.eq("client_id", clientId);
      return leads;
    })(),
    opts.useGa4
      ? fetchGa4ContentTestStats(slugs)
      : Promise.resolve({ configured: false, rows: [], error: undefined as string | undefined }),
  ]);

  const variants = (variantsRes.data ?? []) as ContentVariantRow[];
  const assetIds = variants.map((row) => row.asset_id).filter((id): id is string => Boolean(id));
  const templateIds = variants
    .map((row) => row.email_template_id)
    .filter((id): id is string => Boolean(id));
  const [assetsRes, templatesRes] = await Promise.all([
    assetIds.length
      ? supabase.from("assets").select("id, filename, public_url, mime_type").in("id", assetIds)
      : Promise.resolve({ data: [] }),
    templateIds.length
      ? supabase.from("email_templates").select("id, name").in("id", templateIds)
      : Promise.resolve({ data: [] }),
  ]);
  const assetById = new Map(
    ((assetsRes.data ?? []) as { id: string; filename: string | null; public_url: string | null; mime_type: string | null }[]).map(
      (row) => [row.id, row],
    ),
  );
  const templateById = new Map(
    ((templatesRes.data ?? []) as { id: string; name: string | null }[]).map((row) => [row.id, row.name]),
  );
  const posts = (postsRes.data ?? []) as SocialPostRow[];
  const leads = (leadsRes.data ?? []) as LeadRow[];

  return {
    gaConfigured: ga.configured,
    gaError: ga.error,
    tests: tests.map((test) => {
      const own = variants
        .filter((row) => row.test_id === test.id)
        .sort((a, b) => a.variant.localeCompare(b.variant));
      const results = computeVariantResults({
        test,
        variants: own,
        gaRows: ga.rows,
        leads,
        posts: posts.filter((post) => post.test_id === test.id),
      });
      return {
        test,
        variants: own.map((row) => {
          const asset = row.asset_id ? assetById.get(row.asset_id) : null;
          return {
            ...row,
            asset: asset
              ? { filename: asset.filename, public_url: asset.public_url, mime_type: asset.mime_type }
              : null,
            templateName: row.email_template_id ? templateById.get(row.email_template_id) ?? null : null,
          };
        }),
        results,
        leader: leadingVariant(results),
      };
    }),
  };
}
