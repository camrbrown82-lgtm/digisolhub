import { NextResponse } from "next/server";
import { ensureCampaignChannelSchema } from "@/lib/ensureCampaignChannelSchema";
import { cronAuthorized } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await ensureCampaignChannelSchema({ force: true });
  return NextResponse.json({
    ok: result.ok,
    skipped: "skipped" in result ? result.skipped : false,
    error: "error" in result ? result.error : undefined,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
