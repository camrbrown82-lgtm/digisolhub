import { SocialStudio } from "@/components/hub/SocialStudio";
import { SocialWeekPlanner } from "@/components/hub/SocialWeekPlanner";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";
import { maxDailyBudget } from "@/lib/meta/ads";
import { socialProviderConfigured } from "@/lib/social/providers";
import type { SocialPlan } from "@/lib/social/weekPlan";
import { getWorkspaceClient, isDigisolClient } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  await Promise.race([
    ensureAnalyticsSocialSchema().catch(() => null),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  const supabase = await createClient();
  const active = await getWorkspaceClient(supabase);
  const house = isDigisolClient(active);

  if (!house || !active) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-white">Social</h1>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p>Social posts go out on DigiSol&apos;s Facebook Page and Instagram.</p>
          <p className="mt-2 text-amber-100/80">Switch Working on to DigiSol to write and publish them.</p>
        </div>
      </div>
    );
  }

  const [postersResult, postsResult, planRows] = await Promise.all([
    supabase
      .from("assets")
      .select("public_url, caption, filename, bucket, mime_type, created_at")
      .eq("client_id", active.id)
      .not("public_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("social_posts")
      .select("id, channel, body, status, scheduled_at, published_at, external_url, error_message, metadata")
      .eq("client_id", active.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("social_plans")
      .select("id, status, brief, weekly_budget, summary, why, items, error, created_at, approved_at")
      .eq("client_id", active.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const posters = (postersResult.data ?? [])
    .filter((row) => {
      const url = String(row.public_url || "");
      const mime = String(row.mime_type || "");
      return mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
    })
    .map((row) => ({
      url: row.public_url as string,
      label:
        (row.caption as string | null)?.slice(0, 80) ||
        (row.filename as string | null) ||
        (row.bucket as string | null) ||
        new Date(row.created_at as string).toLocaleDateString("en-CA"),
    }));
  const recent = (postsResult.data ?? []).filter(
    (row) => (row.metadata as { publishMode?: string } | null)?.publishMode !== "manual_facebook_group",
  );
  const connected = socialProviderConfigured("facebook") && socialProviderConfigured("instagram");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-white">Social</h1>
        <WorkspaceScope companyName={active.name} noun="posts" />
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Kaylev writes both captions and builds the image, with this company&apos;s logo and badge, from what you tell
          him. You can swap the image for any file in this workspace, then post now or schedule it. Nothing publishes
          until you approve it.
        </p>
      </div>
      {connected ? null : (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Facebook or Instagram is not connected yet. You can still draft posts. Publishing works after both tokens are
          set.
        </p>
      )}
      <SocialStudio posters={posters} recent={recent} companyName={active.name} />
      <SocialWeekPlanner plans={(planRows.data ?? []) as SocialPlan[]} maxDaily={maxDailyBudget()} />
    </div>
  );
}
