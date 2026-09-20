import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { sendNewDispatchIssues } from "@/lib/dispatchMail";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

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

async function runSend() {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const result = await sendNewDispatchIssues(createAdminClient());
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSend();
}

export async function POST(request: Request) {
  if (cronAuthorized(request)) {
    return runSend();
  }
  const { error } = await requireHubSession();
  if (error) return error;
  return runSend();
}
