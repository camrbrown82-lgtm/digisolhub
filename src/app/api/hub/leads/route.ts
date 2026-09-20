import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { emitHubEvent } from "@/lib/events";
import {
  isLeadChannel,
  isLeadSource,
  isLeadStage,
} from "@/lib/lead-pipeline";
import { findOrCreateClient, getActiveClientId } from "@/lib/workspace";

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function optionalNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function optionalDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = await getActiveClientId();
  let query = supabase.from("leads").select("*").order("updated_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error: queryError } = await query;
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ leads: data });
}

export async function POST(request: Request) {
  const { user, supabase, error } = await requireHubSession();
  if (error || !user) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const name = optionalText(body.name);
  const email = optionalText(body.email)?.toLowerCase() ?? null;
  const phone = optionalText(body.phone);
  const company = optionalText(body.company);
  const source = isLeadSource(String(body.source ?? ""))
    ? String(body.source)
    : "door_to_door";
  const channel = isLeadChannel(String(body.channel ?? ""))
    ? String(body.channel)
    : "in_person";
  const stage = isLeadStage(String(body.stage ?? "")) ? String(body.stage) : "new";

  if (!name && !email && !phone && !company) {
    return NextResponse.json(
      { error: "Add a name, phone, email, or company." },
      { status: 400 },
    );
  }

  const clientId =
    optionalText(body.client_id) ||
    (await getActiveClientId()) ||
    (await findOrCreateClient(supabase, { name: company, domain: null }));

  const notes = optionalText(body.notes);
  const closed = stage === "won" || stage === "lost";

  const { data, error: insertError } = await supabase
    .from("leads")
    .insert({
      name,
      email,
      phone,
      company,
      service: optionalText(body.service),
      source,
      channel,
      location: optionalText(body.location),
      campaign: optionalText(body.campaign),
      stage,
      estimated_value: optionalNumber(body.estimated_value),
      actual_value: optionalNumber(body.actual_value),
      lost_reason: optionalText(body.lost_reason),
      next_follow_up_at: optionalDate(body.next_follow_up_at),
      notes_preview: notes?.slice(0, 280) ?? null,
      client_id: clientId || null,
      created_by: user.id,
      closed_at: closed ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  await supabase.from("lead_activities").insert({
    lead_id: data.id,
    type: "created",
    body: notes || "Lead captured from field marketing.",
    to_stage: stage,
    created_by: user.id,
  });

  await emitHubEvent("hub/lead.created", { leadId: data.id, contactId: null });
  return NextResponse.json({ id: data.id });
}
