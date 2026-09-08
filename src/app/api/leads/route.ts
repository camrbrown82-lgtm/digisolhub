import { NextResponse } from "next/server";
import { hasAdminClient } from "@/lib/supabase/admin";
import { normalizeLead, upsertLead } from "@/lib/leads";

export async function POST(request: Request) {
  const secret = process.env.HUB_INGEST_SECRET;
  const headerSecret = request.headers.get("x-hub-secret");
  const origin = request.headers.get("origin");
  const site = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const sameOrigin =
    !origin ||
    origin.includes("localhost") ||
    origin.includes("wwwdigisol.com") ||
    (site && origin.startsWith(site));

  if (secret && headerSecret !== secret && !sameOrigin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const lead = normalizeLead(body);
    const result = await upsertLead(lead);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
