import { NextResponse } from "next/server";
import { isBot, sanitizePath } from "@/lib/site-analytics";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "content-type");
  return response;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  if (!hasAdminClient()) {
    return cors(NextResponse.json({ error: "Not configured" }, { status: 503 }));
  }

  const agent = request.headers.get("user-agent") ?? "";
  if (isBot(agent)) {
    return cors(NextResponse.json({ ok: true }));
  }

  const body = (await request.json().catch(() => null)) as {
    k?: string;
    path?: string;
    host?: string;
    title?: string;
    referrer?: string;
    locale?: string;
    vid?: string;
  } | null;

  const key = body?.k?.trim();
  if (!key) {
    return cors(NextResponse.json({ error: "Missing key" }, { status: 400 }));
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("site_key", key)
    .maybeSingle();

  if (!client?.id) {
    return cors(NextResponse.json({ error: "Unknown site" }, { status: 404 }));
  }

  const { error } = await admin.from("site_events").insert({
    client_id: client.id,
    visitor_id: (body?.vid ?? "").slice(0, 80) || null,
    host: (body?.host ?? "").slice(0, 180) || null,
    path: sanitizePath(body?.path ?? "/"),
    title: (body?.title ?? "").slice(0, 280) || null,
    referrer: (body?.referrer ?? "").slice(0, 500) || null,
    locale: (body?.locale ?? "").slice(0, 32) || null,
  });

  if (error) {
    return cors(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return cors(NextResponse.json({ ok: true }));
}
