import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { requireHubSession } from "@/lib/auth";
import { toSiteUrl } from "@/lib/competitive/analyze";
import { ensureCompetitiveSchema } from "@/lib/ensureCompetitiveSchema";
import { getWorkspaceClient, resolveClientId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { data } = await supabase
    .from("competitive_analyses")
    .select("id, status, stage, error, completed_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const schema = await ensureCompetitiveSchema().catch((err) => ({
    ok: false as const,
    error: err instanceof Error ? err.message : "schema",
  }));

  const body = (await request.json().catch(() => null)) as {
    url?: string;
    industry?: string;
    location?: string;
    competitorUrls?: string[];
  } | null;

  const active = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || null;
  if (!clientId || !active) {
    return NextResponse.json({ error: "Pick a company under Working on first." }, { status: 400 });
  }

  const url = toSiteUrl(body?.url || active.domain || "");
  if (!url) {
    return NextResponse.json(
      { error: "Add the company website (or set its domain under Companies)." },
      { status: 400 },
    );
  }
  const competitorUrls = (body?.competitorUrls ?? [])
    .map((u) => String(u).trim())
    .filter(Boolean)
    .slice(0, 5)
    .map(toSiteUrl);

  const { data: row, error: insertError } = await supabase
    .from("competitive_analyses")
    .insert({
      client_id: clientId,
      status: "queued",
      stage: "Queued",
      inputs: {
        url,
        industry: (body?.industry || "").trim().slice(0, 120),
        location: (body?.location || "").trim().slice(0, 160),
        competitorUrls,
      },
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return NextResponse.json(
      {
        error: `Could not start the analysis: ${insertError?.message || "unknown error"}${
          schema.ok ? "" : ` (${schema.error})`
        }`,
      },
      { status: 500 },
    );
  }

  try {
    await inngest.send({ name: "hub/competitive.run", data: { analysisId: row.id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not queue the analysis";
    await supabase
      .from("competitive_analyses")
      .update({ status: "failed", stage: null, error: message })
      .eq("id", row.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ id: row.id });
}
