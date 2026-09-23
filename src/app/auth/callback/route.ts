import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link / OTP callbacks are disabled.
 * Hub access is password + owner allowlist only.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore — still bounce to password login
  }
  return NextResponse.redirect(`${origin}/hub/login?error=auth`);
}
