import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { sendCompetitiveReport } from "@/lib/competitive/email";
import { ensureCompetitiveSchema } from "@/lib/ensureCompetitiveSchema";
import { resolveClientId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

/** POST { email, name?, note? } — email this company's competitive analysis from DigiSol. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const clientId = await resolveClientId(supabase);
  if (!clientId) return NextResponse.json({ error: "Pick a company under Working on first." }, { status: 400 });
  await ensureCompetitiveSchema().catch(() => null);

  const body = (await request.json().catch(() => null)) as
    | { email?: string; name?: string; note?: string }
    | null;
  try {
    const result = await sendCompetitiveReport(supabase, {
      analysisId: params.id,
      clientId,
      email: body?.email || "",
      name: body?.name,
      note: body?.note?.slice(0, 2000),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send the report." },
      { status: 400 },
    );
  }
}
