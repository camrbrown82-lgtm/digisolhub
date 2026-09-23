import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { sendNewDispatchIssues } from "@/lib/dispatchMail";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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
