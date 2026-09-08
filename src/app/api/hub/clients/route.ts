import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("clients")
    .select("*")
    .order("name");

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    domain?: string;
    notes?: string;
  };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("clients")
    .insert({
      name,
      domain: body.domain?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id });
}
