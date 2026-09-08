import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/allowlist";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/hub";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && isAllowedEmail(user.email)) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/hub/login?error=not-allowed`);
    }
  }

  return NextResponse.redirect(`${origin}/hub/login?error=auth`);
}
