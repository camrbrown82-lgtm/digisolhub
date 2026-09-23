import { NextResponse } from "next/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { normalizeLead, upsertLead } from "@/lib/leads";
import { clientIp, rateLimit, timingSafeStringEqual } from "@/lib/security";

export async function POST(request: Request) {
  const secret = process.env.HUB_INGEST_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "HUB_INGEST_SECRET is not configured" },
      { status: 503 },
    );
  }

  const headerSecret = request.headers.get("x-hub-secret") || "";
  if (!timingSafeStringEqual(headerSecret, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request);
  const limited = rateLimit({
    key: `leads:${ip}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  if (!hasAdminClient()) {
    return NextResponse.json(
      { error: "CRM ingest is not configured" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const lead = normalizeLead({ ...body, pin_house_client: true });
    const result = await upsertLead(lead);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
