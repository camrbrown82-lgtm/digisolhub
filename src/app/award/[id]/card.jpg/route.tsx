import { ImageResponse } from "next/og";
import sharp from "sharp";
import { awardBadgeElement } from "@/lib/awardBadgeImage";
import { awardTheme, rgba } from "@/lib/awardTheme";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { AWARD_MIN_SCORE, loadAward } from "@/lib/websiteAward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 1200×630 link preview for Facebook and LinkedIn, with the badge centered so no crop reaches the logo. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const [award, theme] = await Promise.all([
    hasAdminClient() ? loadAward(createAdminClient(), params.id) : Promise.resolve({ state: "missing" as const }),
    awardTheme(),
  ]);
  const caption =
    award.state !== "valid"
      ? "wwwdigisol.com"
      : award.house
        ? "The same audit we run for clients · wwwdigisol.com"
        : `Only websites scoring ${AWARD_MIN_SCORE}+ earn it · wwwdigisol.com`;

  try {
    const png = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.background,
            backgroundImage: `radial-gradient(circle at 50% 40%, ${rgba(theme.primary, 0.35)}, ${theme.background} 70%)`,
            fontFamily: "sans-serif",
          }}
        >
          {awardBadgeElement(award, theme, 1.5)}
          <div style={{ display: "flex", marginTop: 36, fontSize: 30, color: rgba(theme.text, 0.75) }}>{caption}</div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
    const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("award card render failed", err);
    return new Response("Card render failed", { status: 500 });
  }
}
