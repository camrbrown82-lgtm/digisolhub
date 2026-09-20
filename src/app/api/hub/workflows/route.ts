import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  WORKFLOW_TRIGGERS,
  emptyWorkflowGraph,
  sanitizeWorkflowGraph,
  type WorkflowTrigger,
} from "@/lib/workflowGraph";
import { getActiveClientId } from "@/lib/workspace";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = await getActiveClientId();
  let query = supabase
    .from("workflows")
    .select("*")
    .order("updated_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error: queryError } = await query;

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ workflows: data });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    trigger?: string;
    graph?: unknown;
    enabled?: boolean;
  };

  const trigger = WORKFLOW_TRIGGERS.includes(body.trigger as WorkflowTrigger)
    ? (body.trigger as WorkflowTrigger)
    : "new_lead";
  const graph = body.graph
    ? sanitizeWorkflowGraph(body.graph, trigger)
    : emptyWorkflowGraph(trigger);

  const { data, error: insertError } = await supabase
    .from("workflows")
    .insert({
      name: body.name?.trim() || "Untitled workflow",
      trigger,
      graph,
      enabled: Boolean(body.enabled),
      client_id: (await getActiveClientId()) || null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id });
}
