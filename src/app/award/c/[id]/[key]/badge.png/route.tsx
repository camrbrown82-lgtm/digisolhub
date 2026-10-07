import { ImageResponse } from "next/og";
import { awardTheme } from "@/lib/awardTheme";
import { competitiveBadgeElement } from "@/lib/competitive/badgeImage";
import { competitiveBadgeFileName, loadPublicCompetitiveBadge } from "@/lib/competitive/publicBadge";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PNG copy for email and for downloading. `?download=1` saves the file. */
export async function GET(request: Request, { params }: { params: { id: string; key: string } }) {
  if (!hasAdminClient()) return new Response("Not found", { status: 404 });
  const [badge, theme] = await Promise.all([
    loadPublicCompetitiveBadge(createAdminClient(), params.id, params.key),
    awardTheme(),
  ]);
  if (!badge) return new Response("Not found", { status: 404 });
  const image = new ImageResponse(competitiveBadgeElement(badge, theme), { width: 640, height: 240 });
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  if (new URL(request.url).searchParams.get("download") === "1") {
    image.headers.set("Content-Disposition", `attachment; filename="${competitiveBadgeFileName(badge.key)}"`);
  }
  return image;
}
