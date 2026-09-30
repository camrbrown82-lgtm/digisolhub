import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { awardBadgeElement } from "@/lib/awardBadgeImage";
import { awardTheme } from "@/lib/awardTheme";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { AWARD_MIN_SCORE, HOUSE_AWARD_ID, loadAward, sampleAward, type AwardStatus } from "@/lib/websiteAward";

const WANTS_BADGE = /\b(award|badge|reward image|seal of excellence|website excellence)\b/i;
const WANTS_HOUSE = /\b(own audit|we pass|our (own )?(site|website)('s)? (score|audit))\b/i;

export type PosterBadge = {
  award: AwardStatus;
  /** Facts the copywriter may use, so the poster never invents award details. */
  facts: string;
};

/**
 * The official award badge for a poster brief that asks for it. DigiSol gets the Excellence Award as an
 * "earn yours" example (or its own-audit badge); other companies get their real award, or none.
 */
export async function resolvePosterBadge(
  db: SupabaseClient,
  client: { id?: string | null; name?: string | null } | null,
  brief: string,
): Promise<{ badge: PosterBadge | null; warning?: string }> {
  if (!WANTS_BADGE.test(brief)) return { badge: null };
  const house = !client?.name || client.name.trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();

  if (house) {
    if (WANTS_HOUSE.test(brief)) {
      const own = await loadAward(db, HOUSE_AWARD_ID);
      if (own.state === "valid") {
        return {
          badge: {
            award: own,
            facts: `DigiSol's own website scored ${own.score}/100 on its website audit (speed, security, SEO).`,
          },
        };
      }
    }
    return {
      badge: {
        award: sampleAward(),
        facts: `The DigiSol Excellence Award goes to websites that score ${AWARD_MIN_SCORE} or higher on DigiSol's website audit, which checks speed, security, and SEO. Businesses can get their site audited at wwwdigisol.com.`,
      },
    };
  }

  if (!client?.id) return { badge: null };
  const { data: audits } = await db
    .from("website_audits")
    .select("id")
    .eq("client_id", client.id)
    .gte("score", AWARD_MIN_SCORE)
    .order("created_at", { ascending: false })
    .limit(5);
  for (const audit of audits ?? []) {
    const award = await loadAward(db, String(audit.id));
    if (award.state === "valid" && !award.house) {
      return {
        badge: {
          award,
          facts: `${award.companyName}'s website scored ${award.score}/100 on DigiSol's website audit and earned the DigiSol Excellence Award.`,
        },
      };
    }
  }
  return {
    badge: null,
    warning: `${client.name} doesn't have a current DigiSol Excellence Award, so no badge was added. Run a website audit of its own site; 90+ earns the award.`,
  };
}

export async function renderBadgePng(award: AwardStatus, width: number) {
  const theme = await awardTheme();
  const scale = width / 640;
  const image = new ImageResponse(awardBadgeElement(award, theme, scale), {
    width: Math.round(640 * scale),
    height: Math.round(240 * scale),
  });
  return Buffer.from(await image.arrayBuffer());
}

/** Adds the badge on a band under the artwork, so it never covers the poster copy. */
export async function addBadgeBand(poster: Buffer, badge: AwardStatus, backgroundColor: string) {
  const meta = await sharp(poster).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;
  const badgeWidth = Math.round(width * 0.62);
  const png = await renderBadgePng(badge, badgeWidth);
  const badgeMeta = await sharp(png).metadata();
  const badgeHeight = badgeMeta.height || Math.round((badgeWidth * 240) / 640);
  const pad = Math.round(width * 0.045);
  const bandHeight = badgeHeight + pad * 2;

  return sharp({
    create: { width, height: height + bandHeight, channels: 4, background: backgroundColor },
  })
    .composite([
      { input: await sharp(poster).png().toBuffer(), top: 0, left: 0 },
      { input: png, top: height + pad, left: Math.round((width - (badgeMeta.width || badgeWidth)) / 2) },
    ])
    .png()
    .toBuffer();
}
