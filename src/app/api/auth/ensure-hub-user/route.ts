import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public hub-user provisioning is disabled.
 * Owner account must already exist in Supabase Auth.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Hub accounts cannot be created from the login page. Sign in with the owner password only.",
    },
    { status: 403 },
  );
}
