import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { ensureCampaignAbSchema } from "@/lib/ensureCampaignAbSchema";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, user, error } = await requireHubSession();
  if (error) return error;

  await Promise.race([
    ensureCampaignAbSchema().catch(() => null),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);

  const body = (await request.json().catch(() => null)) as {
    period?: "day" | "week" | "month";
    note?: string;
    winnerPick?: "A" | "B" | null;
    setCampaignWinner?: boolean;
  } | null;

  if (!body?.note?.trim() && !body?.winnerPick) {
    return NextResponse.json(
      { error: "Add an audit note or pick a winning variant." },
      { status: 400 },
    );
  }

  const period = body.period || "week";
  const winnerPick = body.winnerPick || null;

  const { data: audit, error: auditError } = await supabase
    .from("campaign_audits")
    .insert({
      campaign_id: params.id,
      period,
      note: body.note?.trim() || "",
      winner_pick: winnerPick,
      created_by: user?.id ?? null,
    })
    .select("id, period, note, winner_pick, created_at")
    .single();

  if (auditError) {
    return NextResponse.json(
      {
        error:
          auditError.message ||
          "Could not save audit. Confirm campaign_audits migration is applied.",
      },
      { status: 400 },
    );
  }

  if (body.setCampaignWinner && winnerPick) {
    await supabase
      .from("campaigns")
      .update({ winner_variant: winnerPick })
      .eq("id", params.id);
  }

  return NextResponse.json({ audit });
}

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: listError } = await supabase
    .from("campaign_audits")
    .select("id, period, note, winner_pick, created_at")
    .eq("campaign_id", params.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 });
  }

  return NextResponse.json({ audits: data ?? [] });
}
