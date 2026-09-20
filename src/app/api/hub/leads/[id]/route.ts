import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  isLeadChannel,
  isLeadSource,
  isLeadStage,
} from "@/lib/lead-pipeline";

type Params = { params: { id: string } };

function optionalText(value: unknown) {
  if (value === undefined) return undefined;
  const text = String(value ?? "").trim();
  return text || null;
}

function optionalNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function optionalDate(value: unknown) {
  if (value === undefined) return undefined;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("leads")
    .select("*, lead_activities(*)")
    .eq("id", params.id)
    .single();

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 404 });
  }
  return NextResponse.json({ lead: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { user, supabase, error } = await requireHubSession();
  if (error || !user) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const { data: current, error: currentError } = await supabase
    .from("leads")
    .select("stage")
    .eq("id", params.id)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const nextStage = body.stage == null ? undefined : String(body.stage);
  if (nextStage && !isLeadStage(nextStage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const name = optionalText(body.name);
  const email = optionalText(body.email);
  const phone = optionalText(body.phone);
  const company = optionalText(body.company);
  const service = optionalText(body.service);
  const location = optionalText(body.location);
  const campaign = optionalText(body.campaign);
  const lostReason = optionalText(body.lost_reason);
  const notesPreview = optionalText(body.notes_preview);
  const clientId = optionalText(body.client_id);
  const estimated = optionalNumber(body.estimated_value);
  const actual = optionalNumber(body.actual_value);
  const followUp = optionalDate(body.next_follow_up_at);

  if (name !== undefined) patch.name = name;
  if (email !== undefined) patch.email = email?.toLowerCase() ?? null;
  if (phone !== undefined) patch.phone = phone;
  if (company !== undefined) patch.company = company;
  if (service !== undefined) patch.service = service;
  if (location !== undefined) patch.location = location;
  if (campaign !== undefined) patch.campaign = campaign;
  if (lostReason !== undefined) patch.lost_reason = lostReason;
  if (notesPreview !== undefined) patch.notes_preview = notesPreview;
  if (clientId !== undefined) patch.client_id = clientId;
  if (estimated !== undefined) patch.estimated_value = estimated;
  if (actual !== undefined) patch.actual_value = actual;
  if (followUp !== undefined) patch.next_follow_up_at = followUp;
  if (body.source != null && isLeadSource(String(body.source))) {
    patch.source = String(body.source);
  }
  if (body.channel != null && isLeadChannel(String(body.channel))) {
    patch.channel = String(body.channel);
  }
  if (nextStage) {
    patch.stage = nextStage;
    patch.closed_at =
      nextStage === "won" || nextStage === "lost" ? new Date().toISOString() : null;
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (nextStage && nextStage !== current.stage) {
    await supabase.from("lead_activities").insert({
      lead_id: params.id,
      type:
        nextStage === "won" ? "won" : nextStage === "lost" ? "lost" : "stage_change",
      from_stage: current.stage,
      to_stage: nextStage,
      body: String(body.activity_note ?? "").trim() || `Moved to ${nextStage}.`,
      created_by: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { error: deleteError } = await supabase.from("leads").delete().eq("id", params.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
