import { NextResponse } from "next/server";
import { fetchMetaAdsSummary } from "@/lib/meta/insights";
import { fetchInstagramInsights } from "@/lib/meta/instagramInsights";
import { cronAuthorized } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Sync Meta Ads + Instagram organic Insights into Hub. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [ads, ig] = await Promise.all([
      fetchMetaAdsSummary(14),
      fetchInstagramInsights(),
    ]);
    return NextResponse.json({
      ok: ads.synced || ig.synced,
      ads: {
        configured: ads.configured,
        synced: ads.synced,
        error: ads.error || null,
        spend: ads.spend,
        leads: ads.leads,
        campaigns: ads.campaigns.length,
      },
      instagram: {
        configured: ig.configured,
        synced: ig.synced,
        error: ig.error || null,
        username: ig.username,
        followers: ig.followers,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Meta sync failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
