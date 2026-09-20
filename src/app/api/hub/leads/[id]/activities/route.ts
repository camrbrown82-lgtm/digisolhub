import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { isLeadActivityType } from "@/lib/lead-pipeline";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const { user, supabase, error } = await requireHubSession();
  if (error || !user) return error;

  const body = (await request.json()) as {
    type?: string;
    body?: string;
    occurred_at?: string;
  };
  const type = isLeadActivityType(String(body.type ?? "note"))
    ? String(body.type ?? "note")
    : "note";
  const note = String(body.body ?? "").trim();
  if (!note) {
    return NextResponse.json({ error: "Add what happened." }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("lead_activities").insert({
    lead_id: params.id,
    type,
    body: note,
    occurred_at: body.occurred_at || new Date().toISOString(),
    created_by: user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
