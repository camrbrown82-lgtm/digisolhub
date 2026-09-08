import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/allowlist";
import { createClient } from "@/lib/supabase/server";

export { allowedEmail, isAllowedEmail, siteUrl } from "@/lib/allowlist";

export async function requireHubSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    return {
      user: null,
      supabase,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, supabase, error: null };
}
