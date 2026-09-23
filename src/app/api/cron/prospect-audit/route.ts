import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { runProspectAuditWorker } from "@/lib/prospectAudit/worker";
import type { ProspectTrade } from "@/lib/prospectAudit/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Site fetches + summaries — allow larger batches in growth phase. */
export const maxDuration = 300;

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") || "";
  if (secret) return header === `Bearer ${secret}`;
  const agent = (request.headers.get("user-agent") || "").toLowerCase();
  return process.env.VERCEL === "1" && agent.includes("vercel-cron");
}

type RunBody = {
  trades?: string[];
  dailyMax?: number;
  batchSize?: number;
  dryRun?: boolean;
};

function parseOptions(request: Request, body?: RunBody | null) {
  const url = new URL(request.url);
  const tradesParam =
    body?.trades?.join(",") || url.searchParams.get("trades") || "";
  const trades = tradesParam
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean) as ProspectTrade[];

  const dailyMaxRaw =
    body?.dailyMax ?? Number(url.searchParams.get("dailyMax") || "");
  const batchSizeRaw =
    body?.batchSize ?? Number(url.searchParams.get("batchSize") || "");
  const dryRun =
    body?.dryRun === true ||
    url.searchParams.get("dryRun") === "1" ||
    url.searchParams.get("dryRun") === "true";

  return {
    trades: trades.length ? trades : undefined,
    dailyMax:
      Number.isFinite(dailyMaxRaw) && dailyMaxRaw > 0
        ? Math.min(100, Math.floor(dailyMaxRaw))
        : undefined,
    batchSize:
      Number.isFinite(batchSizeRaw) && batchSizeRaw > 0
        ? Math.min(50, Math.floor(batchSizeRaw))
        : undefined,
    dryRun,
  };
}

async function run(request: Request, body?: RunBody | null) {
  if (!hasAdminClient()) {
    return NextResponse.json(
      { error: "Supabase service role is not configured" },
      { status: 503 },
    );
  }

  const options = parseOptions(request, body);
  const result = await runProspectAuditWorker({
    db: createAdminClient(),
    ...options,
  });

  return NextResponse.json(result);
}

/**
 * DigiSol local prospect-audit cron.
 * GET/POST /api/cron/prospect-audit
 *
 * Body: { dailyMax?: number; batchSize?: number; trades?: string; dryRun?: boolean }
 * Protected by CRON_SECRET (Bearer). DigiSol house budgets are unrestricted
 * unless DIGISOL_ENFORCE_BUDGETS=1. Query/body: trades=hvac&batchSize=25&dailyMax=25&dryRun=1
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await run(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prospect audit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: RunBody | null = null;
  try {
    body = (await request.json()) as RunBody;
  } catch {
    body = null;
  }

  if (cronAuthorized(request)) {
    try {
      return await run(request, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Prospect audit failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const { error } = await requireHubSession();
  if (error) return error;

  try {
    return await run(request, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prospect audit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
