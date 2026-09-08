import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";

const emptyGraph = {
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 80, y: 80 },
      data: { label: "New lead", trigger: "new_lead" },
    },
  ],
  edges: [],
};

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("workflows")
    .select("*")
    .order("updated_at", { ascending: false });

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
  };

  const { data, error: insertError } = await supabase
    .from("workflows")
    .insert({
      name: body.name?.trim() || "Untitled workflow",
      trigger: body.trigger || "new_lead",
      graph: emptyGraph,
      enabled: false,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id });
}
