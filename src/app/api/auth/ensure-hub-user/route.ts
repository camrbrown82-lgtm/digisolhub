import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/allowlist";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { supabaseEnvStatus } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasAdminClient()) {
    const status = supabaseEnvStatus();
    const missing = [
      !status.url ? "SUPABASE_URL" : null,
      !status.serviceRole ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter(Boolean);
    return NextResponse.json(
      {
        error: `Supabase is not connected. Missing on this deploy: ${missing.join(", ")}. Redeploy after adding them to Production and Preview.`,
        missing,
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!isAllowedEmail(email)) {
    return NextResponse.json({ error: "That account cannot access the hub." }, { status: 403 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Use a password of at least 8 characters." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const existing = data.users.find(
    (user) => (user.email ?? "").trim().toLowerCase() === email,
  );

  if (!existing) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) {
      return NextResponse.json({ error: created.error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, created: !existing });
}
