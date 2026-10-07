import { SocialStudio } from "@/components/hub/SocialStudio";
import { getBrandLogoUrl } from "@/lib/brandLogo";
import { brandColourSwatches, brandFromClient } from "@/lib/branding";
import { SocialWeekPlanner } from "@/components/hub/SocialWeekPlanner";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";
import { maxDailyBudget } from "@/lib/meta/ads";
import { socialProviderConfigured } from "@/lib/social/providers";
import type { SocialPlan } from "@/lib/social/weekPlan";
import { mediaLibraryVideos } from "@/lib/media";
import { isArchiveCopy, isBusinessCardAsset } from "@/lib/posterArchive";
import { companySiteUrl, getWorkspaceClient, isDigisolClient } from "@/lib/workspace";
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
      .select("public_url, caption, filename, bucket, mime_type, notes, created_at")
      .eq("client_id", active.id)
      .not("public_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(80),
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

  const posters = (postersResult.data ?? []).flatMap((row) => {
    const url = String(row.public_url || "");
    const mime = String(row.mime_type || "");
    const video = mime.startsWith("video/") || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);
    const image = mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
    if ((!video && !image) || isArchiveCopy(row)) return [];
    const poster = row.bucket === "ai-posters" && !isBusinessCardAsset(row);
    const name =
      (row.caption as string | null)?.slice(0, 80) ||
      (row.filename as string | null) ||
      (row.bucket as string | null) ||
      new Date(row.created_at as string).toLocaleDateString("en-CA");
    return [
      {
        url,
        label: video ? `Video · ${name}` : poster ? `Poster · ${name}` : name,
        kind: video ? ("video" as const) : ("image" as const),
        source: poster ? ("poster" as const) : undefined,
      },
    ];
  });
  const known = new Set(posters.map((file) => file.url.split("?")[0]));
  const library = mediaLibraryVideos().filter((file) => !known.has(file.url.split("?")[0]));
  const savedPosters = posters.filter((file) => file.source === "poster");
  const otherFiles = posters.filter((file) => file.source !== "poster");
  const files = [...savedPosters, ...otherFiles, ...library];
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
          Kaylev writes both captions. Pick a saved poster and he writes the posts for that image, or ask him to
          build a new one. Pick a video from DigiSol media or upload an MP4 or MOV, then post it to Facebook and
          Instagram. Nothing publishes until you approve it.
        </p>
      </div>
      {connected ? null : (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Facebook or Instagram is not connected yet. You can still draft posts. Publishing works after both tokens are
          set.
        </p>
      )}
      <SocialStudio
        posters={files}
        recent={recent}
        companyName={active.name}
        logoUrl={await getBrandLogoUrl(supabase, active)}
        siteUrl={companySiteUrl(active)}
        palette={brandColourSwatches(brandFromClient(active).brand)}
      />
      <SocialWeekPlanner plans={(planRows.data ?? []) as SocialPlan[]} maxDaily={maxDailyBudget()} />
    </div>
  );
}
