import { awardTheme } from "@/lib/awardTheme";
import { competitiveBadgeResponse, competitiveBadgeSvg, pngDownloadName } from "@/lib/competitive/badgeSvg";
import { loadPublicCompetitiveBadge } from "@/lib/competitive/publicBadge";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public badge image. Other websites load this URL. `?download=1` saves the file. */
export async function GET(request: Request, { params }: { params: { id: string; key: string } }) {
  if (!hasAdminClient()) return new Response("Not found", { status: 404 });
  const [badge, theme] = await Promise.all([
    loadPublicCompetitiveBadge(createAdminClient(), params.id, params.key),
    awardTheme(),
  ]);
  if (!badge) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const name = download ? pngDownloadName(badge).replace(/\.png$/, ".svg") : undefined;
  return competitiveBadgeResponse(competitiveBadgeSvg(theme, badge), name);
}
