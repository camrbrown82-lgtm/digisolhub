import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { clearHubPass, setHubPass } from "@/lib/hubPass";

export const dynamic = "force-dynamic";

/** Called right after a password sign-in to open the Hub for this visit. */
export async function POST() {
  const { error } = await requireHubSession();
  if (error) return error;

  const response = NextResponse.json({ ok: true });
  setHubPass(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearHubPass(response);
  return response;
}
