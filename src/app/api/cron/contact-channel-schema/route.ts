import { NextResponse } from "next/server";
import { ensureCampaignChannelSchema } from "@/lib/ensureCampaignChannelSchema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") || "";
  if (secret) return header === `Bearer ${secret}`;
  const agent = (request.headers.get("user-agent") || "").toLowerCase();
  return process.env.VERCEL === "1" && agent.includes("vercel-cron");
}

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
