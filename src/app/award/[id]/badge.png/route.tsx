import { ImageResponse } from "next/og";
import { awardBadgeElement } from "@/lib/awardBadgeImage";
import { awardTheme } from "@/lib/awardTheme";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { loadAward } from "@/lib/websiteAward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PNG copy of the badge for email, since Gmail and Outlook don't show SVG images. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const [award, theme] = await Promise.all([
    hasAdminClient() ? loadAward(createAdminClient(), params.id) : Promise.resolve({ state: "missing" as const }),
    awardTheme(),
  ]);
  const image = new ImageResponse(awardBadgeElement(award, theme), { width: 640, height: 240 });
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return image;
}
