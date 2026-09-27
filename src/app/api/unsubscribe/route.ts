import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { unsubscribeContactsByEmail } from "@/lib/unsubscribeContact";

export const dynamic = "force-dynamic";

/**
 * POST from the /unsubscribe page (JSON body) or an inbox one-click
 * unsubscribe (RFC 8058: form body, email + token in the query string).
 */
export async function POST(request: Request) {
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";
  let email = url.searchParams.get("email") ?? "";
  let token = url.searchParams.get("token") ?? "";
  let oneClick = false;

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      token?: string;
    };
    email = body.email ?? email;
    token = body.token ?? token;
  } else {
    const form = await request.formData().catch(() => null);
    oneClick = form?.get("List-Unsubscribe") === "One-Click";
    email = String(form?.get("email") ?? email);
    token = String(form?.get("token") ?? token);
  }

  email = email.trim().toLowerCase();
  if (!email || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }

  await unsubscribeContactsByEmail(
    createAdminClient(),
    email,
    oneClick ? "one_click" : "email_link",
  );

  return NextResponse.json({ ok: true });
}

/** A plain visit to the one-click URL shows the confirm page instead. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dest = new URL("/unsubscribe", url.origin);
  for (const key of ["email", "token"]) {
    const value = url.searchParams.get(key);
    if (value) dest.searchParams.set(key, value);
  }
  return NextResponse.redirect(dest, 303);
}
