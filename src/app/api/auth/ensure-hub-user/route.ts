import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/allowlist";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!hasAdminClient()) {
    return NextResponse.json(
      {
        error:
          "Supabase is not connected. On Vercel set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then redeploy.",
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
