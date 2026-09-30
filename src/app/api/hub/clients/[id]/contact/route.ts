import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { signUpClientContact } from "@/lib/clientOnboarding";

export const dynamic = "force-dynamic";

/** POST { name?, email, startOnboarding? } — set a company's sign-up contact and start onboarding. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; startOnboarding?: boolean }
    | null;
  try {
    const result = await signUpClientContact(supabase, {
      clientId: params.id,
      email: body?.email || "",
      name: body?.name,
      startOnboarding: body?.startOnboarding !== false,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not add the contact." },
      { status: 400 },
    );
  }
}
