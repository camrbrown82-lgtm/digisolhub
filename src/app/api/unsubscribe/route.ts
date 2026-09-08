import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export async function POST(request: Request) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = (await request.json()) as { email?: string; token?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const token = body.token ?? "";

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("contacts")
    .update({ unsubscribed_at: new Date().toISOString() })
    .ilike("email", email);

  return NextResponse.json({ ok: true });
}
