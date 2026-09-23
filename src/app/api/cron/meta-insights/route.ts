import { NextResponse } from "next/server";
import { fetchMetaAdsSummary } from "@/lib/meta/insights";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

/** Sync Meta Ads Insights into Hub (spend, clicks, Pixel leads). */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await fetchMetaAdsSummary(14);
    return NextResponse.json({
      ok: summary.synced,
      configured: summary.configured,
      error: summary.error || null,
      spend: summary.spend,
      leads: summary.leads,
      campaigns: summary.campaigns.length,
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
